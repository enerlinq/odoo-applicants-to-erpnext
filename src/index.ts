import { OdooClient } from './odoo.js';
import { ERPNextClient } from './erpnext.js';
import { mapOdooToERPNextApplicant } from './mapper.js';

async function main() {
    console.log("Starting HR Applicant Synchronization (Odoo -> ERPNext)");

    const odoo = new OdooClient();
    const erpnext = new ERPNextClient();

    try {
        await odoo.authenticate();

        const applicants = await odoo.getApplicants(50); // Fetch top 50 active
        console.log(`Successfully fetched ${applicants.length} applicants from Odoo.\n`);

        for (const odooApp of applicants) {
            const erpApp = mapOdooToERPNextApplicant(odooApp);
            console.log(`Processing Applicant: ${erpApp.applicant_name}...`);

            // Step 1: Duplicate check by email
            if (erpApp.email_id && await erpnext.applicantExists(erpApp.email_id)) {
                console.log(`[SKIP] ERPNext applicant already exists with email ${erpApp.email_id}`);
                continue;
            }

            // Step 2: Create Applicant in ERPNext
            console.log(`Creating record in ERPNext...`);
            let docName: string;
            try {
                // Remove some undefined values to ensure JSON compliance if needed
                const cleanApp = Object.fromEntries(Object.entries(erpApp).filter(([_, v]) => v != null));
                docName = await erpnext.createApplicant(cleanApp as any);
                console.log(`[SUCCESS] Created applicant ${docName}.`);
            } catch (err: any) {
                console.error(`[ERROR] Failed to create applicant ${erpApp.applicant_name}: ${err.message}`);
                continue;
            }

            // Step 3: Fetch and Upload Resumes
            console.log(`Fetching attachments for Odoo Applicant ID ${odooApp.id}...`);
            const attachments = await odoo.getApplicantResumes(odooApp.id);
            console.log(`Found ${attachments.length} attachment(s).`);

            for (const att of attachments) {
                console.log(`Uploading ${att.name} to ERPNext...`);
                try {
                    // Odoo stores resumes as base64 in the 'datas' field
                    const fileUrl = await erpnext.attachResume(docName, att.name, att.datas);
                    console.log(`[SUCCESS] Attached ${att.name}.`);

                    // Update the resume_attachment field if not already updated
                    await erpnext.updateApplicant(docName, { resume_attachment: fileUrl });
                    console.log(`[SUCCESS] Updated resume_attachment field with ${fileUrl}.`);
                } catch (err: any) {
                    console.error(`[ERROR] Failed to attach resume ${att.name}: ${err.message}`);
                }
            }

            console.log(`Finished processing: ${erpApp.applicant_name}\n---`);
        }

        console.log("Synchronization Complete.");
    } catch (error) {
        console.error("Critical Synchronization Error:", error);
        process.exit(1);
    }
}

// Start the process
main();