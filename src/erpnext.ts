import { env } from './config.js';

export interface ERPNextApplicant {
    applicant_name: string;
    email_id?: string;
    phone_number?: string;
    status?: string;
    job_title?: string;
    department?: string;
    cover_letter?: string;
}

export class ERPNextClient {
    private headers = {
        'Authorization': `token ${env.ERPNEXT_API_KEY}:${env.ERPNEXT_API_SECRET}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };

    /**
     * Checks if a job applicant already exists by Email
     */
    async applicantExists(email: string): Promise<boolean> {
        if (!email) return false;
        
        const url = `${env.ERPNEXT_URL}/api/resource/Job Applicant?filters=[["email_id","=","${email}"]]&fields=["name"]`;
        const res = await fetch(url, { headers: this.headers });
        
        if (!res.ok) {
            console.error(`Failed to lookup applicant ${email} in ERPNext (${res.status})`);
            return false;
        }

        const data: any = await res.json();
        return data.data && data.data.length > 0;
    }

    /**
     * Creates a new Job Applicant in ERPNext
     */
    async createApplicant(applicant: ERPNextApplicant): Promise<string> {
        const url = `${env.ERPNEXT_URL}/api/resource/Job Applicant`;
        const res = await fetch(url, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify(applicant)
        });

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`ERPNext API Error (${res.status}): ${errorText}`);
        }

        const data: any = await res.json();
        return data.data.name; // ERPNext returns the document ID as 'name'
    }

    /**
     * Uploads an attachment and links it to the specific document
     * Notice: ERPNext expects multipart/form-data for file uploads
     */
    async attachResume(
        docName: string, 
        fileName: string, 
        base64Data: string, 
        isPrivate: number = 1
    ): Promise<string> {
        const url = `${env.ERPNEXT_URL}/api/method/upload_file`;

        const formData = new FormData();
        formData.append("cmd", "uploadfile");
        formData.append("from_form", "1");
        formData.append("doctype", "Job Applicant");
        formData.append("docname", docName);
        formData.append("filename", fileName);
        formData.append("filedata", `data:application/pdf;base64,${base64Data}`);
        formData.append("is_private", isPrivate.toString());

        const uploadHeaders = {
            'Authorization': `token ${env.ERPNEXT_API_KEY}:${env.ERPNEXT_API_SECRET}`,
            'Accept': 'application/json'
        };

        const res = await fetch(url, {
            method: 'POST',
            headers: uploadHeaders,
            body: formData as any
        });

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`ERPNext Upload Error (${res.status}): ${errorText}`);
        }

        
        const data: any = await res.json();
        return data.message.file_url;
    }

    /**
     * Updates an existing Job Applicant document in ERPNext
     */
    async updateApplicant(docName: string, updates: Partial<ERPNextApplicant> & { resume_attachment?: string }): Promise<void> {
        const url = `${env.ERPNEXT_URL}/api/resource/Job Applicant/${docName}`;
        const res = await fetch(url, {
            method: 'PUT',
            headers: this.headers,
            body: JSON.stringify(updates)
        });

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`ERPNext Update Error (${res.status}): ${errorText}`);
        }
    }
}
