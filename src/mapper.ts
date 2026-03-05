import type { OdooApplicant } from './odoo.js';
import type { ERPNextApplicant } from './erpnext.js';

export function mapOdooToERPNextApplicant(odooApplicant: OdooApplicant): ERPNextApplicant {
    // Determine a mapped status. 
    // This typically needs specific mapping rules as Odoo stages differ from ERPNext status
    // Odoo: "Initial Qualification", "First Interview"
    // ERPNext: "Open", "Replied", "Rejected", "Hold", "Accepted"
    let status = 'Open';
    
    // Convert descriptions, removing possible False boolean flag
    const convertString = (val: any) => val ? String(val) : undefined;
    
    // Safely get candidate fields
    const candidateName = odooApplicant.candidate?.partner_name || '';
    const emailFrom = odooApplicant.candidate?.email_from;
    const partnerPhone = odooApplicant.candidate?.partner_phone;

    return {
        applicant_name: convertString(candidateName) || 'Unknown Candidate',
        email_id: convertString(emailFrom),
        phone_number: convertString(partnerPhone),
        cover_letter: convertString(odooApplicant.applicant_notes),
        status: status,
        // job_id and department_id come as [id, 'Name'] tuples in XMLRPC, unless False
        job_title: odooApplicant.job_id && Array.isArray(odooApplicant.job_id) ? odooApplicant.job_id[1] : undefined,
        department: odooApplicant.department_id && Array.isArray(odooApplicant.department_id) ? odooApplicant.department_id[1] : undefined,
    };
}
