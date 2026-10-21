import dotenv from 'dotenv';
import mongoose from 'mongoose';
import DocumentTemplate from '../src/models/DocumentTemplate.js';

dotenv.config();

// Shared customer header placed at the top of every generated document.
// Uses only placeholders supported by documentGeneration.service.js.
const HEADER = `CUSTOMER
{{customer.fullName}}
{{customer.phone}}

MOVING FROM
{{moveDetails.movingFrom}}

MOVING TO
{{moveDetails.movingTo}}`;

// The five existing, active template records. Updates are matched by _id AND key
// so a wrong/moved record can never be overwritten. No upsert, no new records.
const TEMPLATES = [
  {
    key: 'DOCUMENT_1',
    id: '6ab2da768fb6e1ec924ccc91',
    name: 'TV Inspection and Previous Damage Report',
    description:
      'Records television condition at pickup and drop-off, with an additional notes area.',
    content: `${HEADER}

TV Inspection and Previous Damage Report

The information below describes the condition of your television(s) at the pickup address before they are wrapped by our team and their condition at the drop-off address after our team unwraps them.

If the recorded information is inaccurate, please inform the crew chief so the condition can be reviewed and documented.

Televisions packed by the customer or collected from independent storage facilities may be subject to different handling and coverage conditions. The applicable moving-service agreement and selected coverage terms govern.

Television(s) Condition at Pick Up

[ ] No Physical Damage

[ ] With Small Damage — scratches, dents, or cracks on the screen, body, or base

[ ] With Large Physical Damage — broken screen, numerous dents, or broken base

[ ] Condition Unknown — television packed by customer

[ ] Condition Unknown — television picked up from an independent storage facility

Television(s) Condition at Drop Off

[ ] No Physical Damage

[ ] With Small Damage — scratches, dents, or cracks on the screen, body, or base

[ ] With Large Physical Damage — broken screen, numerous dents, or broken base

[ ] Condition Unknown — television packed by customer

[ ] Condition Unknown — television picked up from an independent storage facility

Other Situation Details

Additional observations or notes:

__________________________________________________

__________________________________________________

__________________________________________________`,
  },
  {
    key: 'DOCUMENT_2',
    id: '6ab2da768fb6e1ec924ccc92',
    name: 'Job Completion Form',
    description:
      'Job completion form confirming the services were completed, with issues and customer signature.',
    content: `${HEADER}

Confirmation of Completion

Move Date: {{moveDetails.movingDate}}

I, {{customer.fullName}}, the undersigned, acknowledge that the moving services provided by NextViewMove on the specified date have been completed.

Any issues encountered during the move have been noted below.

Issues Encountered (if any)

__________________________________________________

__________________________________________________

__________________________________________________

By signing below, I acknowledge that the services outlined above have been completed as agreed, subject to any issues recorded in this form and the applicable service agreement.

Customer Signature:`,
  },
  {
    key: 'DOCUMENT_3',
    id: '6ab2da768fb6e1ec924ccc93',
    name: 'Waiver and Release of Liability Agreement',
    description:
      'Waiver recording customer requests, special conditions, and non-routine moving risks.',
    content: `${HEADER}

Waiver and Release of Liability Agreement

This agreement records specific moving conditions, customer requests, and risks discussed between the customer and NextViewMove. It must be read together with the applicable moving-service agreement and applicable law.

Customer: {{customer.fullName}}

Customer Requests and Special Conditions

The customer should identify applicable conditions before the moving work begins.

[ ] Customer requests that moving blankets and/or floor runners not be used.

[ ] Parking restrictions or the absence of designated parking may result in parking tickets or other charges, subject to the agreed service terms and applicable law.

[ ] Customer requests packing without packing paper.

[ ] Customer requests moving a mattress or box spring without a mattress bag.

[ ] Customer requests mounting a television, curtains, shelves, or another item requiring drilling or making holes in a wall or other surface.

[ ] Customer requests moving an oversized item through a narrow corridor, doorway, stairway, or another restricted area.

[ ] Customer intends to assist with handling, loading, or unloading items from the truck or otherwise assist the moving crew.

Non-Routine Moving Conditions

Non-routine moving conditions may include moving large or heavy items through tight spaces, narrow doorways, difficult stairways, crowded work areas, areas with sharp edges, over balconies, or during adverse weather.

The moving company should assess these conditions, communicate foreseeable risks, and take reasonable safety precautions. Any allocation of responsibility for resulting damage is subject to the applicable service agreement and law.

Property and Item Condition

The customer and moving company should document pre-existing damage, fragile or unique items, unstable furniture, oversized items, restricted access, and items that have not been adequately prepared or packed.

The parties should record any agreed exceptions to normal wrapping, packing, protection, or handling procedures before work begins.

Customer Acknowledgment

The customer acknowledges that the conditions and requests recorded in this document may affect how the moving work is carried out. Any waiver or limitation of responsibility applies only to the extent permitted by applicable law and the agreed service terms.

Additional conditions or notes:

__________________________________________________

__________________________________________________

__________________________________________________

Customer Signature:`,
  },
  {
    key: 'DOCUMENT_4',
    id: '6ab2da768fb6e1ec924ccc94',
    name: 'Terms & Conditions',
    description:
      'General terms and conditions for NextViewMove moving services (draft pending business/legal review).',
    content: `${HEADER}

Terms and Conditions

These Terms and Conditions describe the general basis on which NextViewMove provides moving services. They should be read together with the customer's booking confirmation, estimate, and any separately agreed service documents.

1. Scope of Services

NextViewMove will provide the moving services agreed with the customer in the booking confirmation or written estimate. Additional services or changes to the agreed work may require a revised price or schedule.

2. Customer Responsibilities

The customer should provide accurate moving addresses, contact details, inventory information, access requirements, and known restrictions or special handling needs. The customer should identify fragile, valuable, oversized, or unusually heavy items before moving begins.

3. Estimates and Charges

The price, charging method, included services, applicable taxes, additional charges, and payment schedule must be stated in the customer's estimate or booking confirmation.

This template does not establish a specific deposit, hourly rate, cancellation fee, or payment deadline. The business must confirm these policies separately.

4. Access and Parking

The customer should advise NextViewMove of parking restrictions, building rules, elevator reservations, stairs, access limitations, and other conditions that may affect the move.

Responsibility for additional costs must be determined by the agreed booking terms and applicable law.

5. Scheduling and Delays

Moving schedules may be affected by traffic, weather, access restrictions, or other circumstances beyond reasonable control. NextViewMove should communicate material delays and discuss reasonable alternatives with the customer.

6. Packing and Special Items

The parties should agree in advance on packing services, protective materials, disassembly, reassembly, and handling requirements for fragile, oversized, or special items.

Any exclusions or additional charges must be disclosed and agreed upon.

7. Damage, Loss, and Claims

Customers should report concerns about loss or damage promptly and provide relevant details and supporting evidence.

Applicable liability, insurance or valuation coverage, claim procedures, and deadlines must be established in the company's approved service agreement and comply with applicable law.

8. Cancellation and Changes

The company's cancellation, rescheduling, and refund policies must be communicated to the customer before booking and confirmed in the booking terms.

This template does not establish a specific cancellation deadline or fee.

9. Safety

NextViewMove and the customer should communicate known hazards and cooperate to support safe moving operations. Work may need to be paused or adjusted if conditions create an unreasonable safety risk.

10. Privacy

Customer information will be handled according to the company's applicable privacy practices and privacy policy.

11. Disputes and Applicable Law

Disputes will be addressed under the applicable agreement and relevant law. The governing jurisdiction and any dispute-resolution procedure must be confirmed by the business and reviewed for legal compliance.

12. Agreement

The customer should review the booking confirmation, estimate, these terms, and any additional documents before accepting the services. Any required acceptance or signature must use the company's approved process.`,
  },
  {
    key: 'DOCUMENT_5',
    id: '6ab2da768fb6e1ec924ccc95',
    name: 'Privacy Policy',
    description:
      'Privacy policy describing the intended handling of personal information (draft pending business/legal review).',
    content: `${HEADER}

Privacy Policy

This Privacy Policy describes the intended approach to handling personal information in connection with NextViewMove enquiries, estimates, bookings, moving services, and website use.

The company must confirm that this policy accurately reflects its actual practices and applicable privacy laws before publication.

1. Information That May Be Collected

Depending on the services used, the company may need customer contact details, moving addresses, booking information, service requirements, communications, and payment-related records.

Website technologies may also collect technical information such as browser or device details.

Only information reasonably needed for the relevant business purpose should be collected.

2. How Information May Be Used

Personal information may be used for purposes such as responding to enquiries, preparing estimates, arranging and delivering moving services, communicating about bookings, handling customer concerns, maintaining business records, and meeting legal obligations.

Marketing communications must follow applicable consent and opt-out requirements.

3. Disclosure to Others

Information may need to be shared with service providers or other parties supporting the company's operations, where appropriate and legally permitted.

The company must confirm which service providers receive personal information and under what safeguards.

4. Storage and Security

The company should use reasonable safeguards appropriate to the sensitivity of the information it holds. No online storage or transmission method can be guaranteed to be completely secure.

The company must confirm its actual storage locations, access controls, security procedures, and retention practices before adopting this section as final policy.

5. Retention

Personal information should be retained only as long as necessary for the purposes for which it was collected, subject to applicable legal, accounting, contractual, and dispute-related requirements.

The company's actual retention periods must be confirmed.

6. Cookies and Website Technologies

If the website uses cookies, analytics, or similar technologies, the company should explain what those technologies collect, why they are used, and what choices are available to visitors.

This section must be updated to reflect the technologies actually in use.

7. Individual Privacy Rights

Depending on applicable law, individuals may have rights to request access to or correction of their personal information, or to exercise other privacy rights.

Requests should be handled through a verified contact method published by the company.

8. Third-Party Websites

The company's website may link to third-party websites or services. Their privacy practices are governed by their own policies, which customers should review separately.

9. Policy Updates

The company may update this policy when its practices or legal obligations change. The company should publish the updated policy and its effective date as appropriate.

10. Contact Information

For privacy questions or requests, customers should use the company's officially confirmed contact details published on its website or booking documents.`,
  },
];

const apply = process.argv.includes('--apply');

const run = async () => {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    throw new Error('MONGO_URI is not defined in the environment variables');
  }

  await mongoose.connect(uri);
  console.log(
    `MongoDB connected: ${mongoose.connection.host} (db: ${mongoose.connection.name})`
  );

  // Verify every target record first; abort before writing anything on any mismatch.
  const existingByKey = new Map();
  for (const template of TEMPLATES) {
    const existing = await DocumentTemplate.findById(template.id);
    if (!existing) {
      throw new Error(`Template ${template.key} (${template.id}) not found. No changes made.`);
    }
    if (existing.key !== template.key) {
      throw new Error(
        `Record ${template.id} has key "${existing.key}", expected "${template.key}". No changes made.`
      );
    }
    existingByKey.set(template.key, existing);
  }

  if (!apply) {
    console.log('DRY RUN (pass --apply to write). Planned changes:');
    for (const template of TEMPLATES) {
      const existing = existingByKey.get(template.key);
      console.log(
        `  ${template.key} ${template.id}: name "${existing.name}" -> "${template.name}"`
      );
    }
    await mongoose.disconnect();
    return;
  }

  let updated = 0;
  for (const template of TEMPLATES) {
    const result = await DocumentTemplate.updateOne(
      { _id: template.id, key: template.key },
      {
        $set: {
          name: template.name,
          description: template.description,
          content: template.content,
        },
      }
    );
    if (result.matchedCount === 1) {
      updated += 1;
    }
    console.log(
      `Updated ${template.key} (${template.id}): name="${template.name}" modified=${result.modifiedCount}`
    );
  }

  console.log(
    `Update complete. Records updated: ${updated}/${TEMPLATES.length}. Existing keys/ids preserved; TEST_DOCUMENT and all other records untouched.`
  );

  await mongoose.disconnect();
};

run().catch((error) => {
  console.error(`Update failed: ${error.message}`);
  process.exit(1);
});
