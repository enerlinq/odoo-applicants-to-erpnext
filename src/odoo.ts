import * as xmlrpc from 'xmlrpc';
import { env } from './config.js';

export interface OdooCandidate {
    id: number;
    partner_name: string | false;
    email_from: string | false;
    partner_phone: string | false;
}

export interface OdooApplicant {
    id: number;
    candidate_id: [number, string] | false;
    applicant_notes: string | false;
    job_id: [number, string] | false;
    department_id: [number, string] | false;
    stage_id: [number, string] | false;
    create_date: string;
    
    // Candidate details populated via reference
    candidate?: OdooCandidate;
}

export interface OdooAttachment {
    id: number;
    name: string;
    datas: string;
    mimetype: string;
}

export class OdooClient {
    private url = new URL(env.ODOO_URL);
    private commonClient: xmlrpc.Client;
    private modelsClient: xmlrpc.Client;
    private uid: number | null = null;

    constructor() {
        const clientOptions = {
            host: this.url.hostname,
            port: parseInt(this.url.port || (this.url.protocol === 'https:' ? '443' : '80'), 10),
            path: '/xmlrpc/2/common',
            https: this.url.protocol === 'https:'
        };
        
        const modelsOptions = {
            ...clientOptions,
            path: '/xmlrpc/2/object'
        };

        this.commonClient = clientOptions.https ? xmlrpc.createSecureClient(clientOptions) : xmlrpc.createClient(clientOptions);
        this.modelsClient = modelsOptions.https ? xmlrpc.createSecureClient(modelsOptions) : xmlrpc.createClient(modelsOptions);
    }

    private promisify(client: xmlrpc.Client, method: string, params: any[]): Promise<any> {
        return new Promise((resolve, reject) => {
            client.methodCall(method, params, (error, value) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(value);
                }
            });
        });
    }

    async authenticate(): Promise<void> {
        console.log(`Authenticating with Odoo at ${env.ODOO_URL}...`);
        this.uid = await this.promisify(this.commonClient, 'authenticate', [
            env.ODOO_DB,
            env.ODOO_USERNAME,
            env.ODOO_PASSWORD,
            {}
        ]);

        if (!this.uid) {
            throw new Error('Odoo Authentication failed.');
        }
        console.log(`Odoo Authentication successful (UID: ${this.uid}).`);
    }

    async getApplicants(limit: number = 100): Promise<OdooApplicant[]> {
        if (!this.uid) throw new Error("Not authenticated");
        
        console.log(`Fetching up to ${limit} HR applicants from Odoo...`);
        const applicants = await this.promisify(this.modelsClient, 'execute_kw', [
            env.ODOO_DB,
            this.uid,
            env.ODOO_PASSWORD,
            'hr.applicant',
            'search_read',
            // Search criteria e.g., active = true
            [[['active', '=', true]]],
            {
                fields: ['candidate_id', 'applicant_notes', 'job_id', 'department_id', 'stage_id', 'create_date'],
                limit: limit
            }
        ]) as OdooApplicant[];

        // Fetch candidate details
        const candidateIds = applicants
            .map(app => app.candidate_id ? app.candidate_id[0] : null)
            .filter(id => id !== null) as number[];

        if (candidateIds.length > 0) {
            console.log(`Fetching ${candidateIds.length} candidate(s) details from Odoo...`);
            const candidates = await this.promisify(this.modelsClient, 'execute_kw', [
                env.ODOO_DB,
                this.uid,
                env.ODOO_PASSWORD,
                'hr.candidate',
                'search_read',
                [[['id', 'in', candidateIds]]],
                {
                    fields: ['partner_name', 'email_from', 'partner_phone']
                }
            ]) as OdooCandidate[];

            // Map candidates back to applicants
            const candidateMap = new Map();
            candidates.forEach(c => candidateMap.set(c.id, c));

            applicants.forEach(app => {
                if (app.candidate_id) {
                    app.candidate = candidateMap.get(app.candidate_id[0]);
                }
            });
        }
        
        return applicants;
    }

    async getApplicantResumes(applicantId: number): Promise<OdooAttachment[]> {
        if (!this.uid) throw new Error("Not authenticated");

        // We fetch attachments that are linked to this hr.applicant, typically filtering by res_model & res_id
        const attachments = await this.promisify(this.modelsClient, 'execute_kw', [
            env.ODOO_DB,
            this.uid,
            env.ODOO_PASSWORD,
            'ir.attachment',
            'search_read',
            [[
                ['res_model', '=', 'hr.applicant'],
                ['res_id', '=', applicantId],
                // Optionally filter by mimetype like PDF
                ['mimetype', 'in', ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']]
            ]],
            {
                fields: ['name', 'datas', 'mimetype']
            }
        ]);

        return attachments as OdooAttachment[];
    }
}
