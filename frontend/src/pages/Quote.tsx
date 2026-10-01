import { useState } from "react";
import { ApiError, apiClient } from "../lib/apiClient";

type Page = "home" | "services" | "about" | "quote" | "reviews" | "contact";

interface QuoteProps {
  setPage: (page: Page) => void;
}

const moveTypes = ["Local (within city)", "Long-Distance (between cities)", "Inter-provincial"];
const homeTypes = ["House", "Apartment / Condo", "Townhouse", "Office / Commercial", "Storage Unit"];
const bedrooms = ["Studio", "1 Bedroom", "2 Bedrooms", "3 Bedrooms", "4 Bedrooms", "5+ Bedrooms"];

/* ---------------------------------------------------------------------------
 * UI -> backend mapping for POST /api/leads
 * ---------------------------------------------------------------------------
 * The select labels below are the human-readable values shown in the form. The
 * backend expects the enum values listed here. Every conversion lives in this
 * one block so the component itself stays free of API concerns and the labels
 * never have to change to satisfy the API.
 */

type MoveType = "LOCAL" | "LONG_DISTANCE" | "INTER_PROVINCIAL";
type PropertyType =
  | "HOUSE"
  | "APARTMENT"
  | "CONDO"
  | "TOWNHOUSE"
  | "OFFICE"
  | "COMMERCIAL"
  | "STORAGE_UNIT";
type Bedrooms = "STUDIO" | "ONE" | "TWO" | "THREE" | "FOUR" | "FIVE_PLUS";
type OriginFloor = "GROUND_MAIN" | "SECOND" | "THIRD" | "FOURTH" | "FIFTH" | "SIX_PLUS";
type Elevator = "YES" | "NO" | "BOTH_LOCATIONS" | "ORIGIN_ONLY" | "DESTINATION_ONLY";
type Stairs = "NO_STAIRS" | "A_FEW_STEPS" | "ONE_FULL_FLIGHT" | "MULTIPLE_FLIGHTS";
type Service =
  | "MOVING"
  | "PACKING"
  | "UNPACKING"
  | "FURNITURE_ASSEMBLY"
  | "HEAVY_ITEM_MOVING"
  | "LOADING_ONLY"
  | "UNLOADING_ONLY";

const MOVE_TYPE_BY_LABEL: Record<string, MoveType> = {
  "Local (within city)": "LOCAL",
  "Long-Distance (between cities)": "LONG_DISTANCE",
  "Inter-provincial": "INTER_PROVINCIAL",
};

// The form offers combined labels for two backend values. The representative
// value is used so the existing options stay untouched: "Apartment / Condo"
// maps to APARTMENT, "Office / Commercial" maps to OFFICE. CONDO and
// COMMERCIAL are valid backend values but are not reachable from the current
// options.
const PROPERTY_TYPE_BY_LABEL: Record<string, PropertyType> = {
  House: "HOUSE",
  "Apartment / Condo": "APARTMENT",
  Townhouse: "TOWNHOUSE",
  "Office / Commercial": "OFFICE",
  "Storage Unit": "STORAGE_UNIT",
};

const BEDROOMS_BY_LABEL: Record<string, Bedrooms> = {
  Studio: "STUDIO",
  "1 Bedroom": "ONE",
  "2 Bedrooms": "TWO",
  "3 Bedrooms": "THREE",
  "4 Bedrooms": "FOUR",
  "5+ Bedrooms": "FIVE_PLUS",
};

const ORIGIN_FLOOR_BY_LABEL: Record<string, OriginFloor> = {
  "Ground / Main Floor": "GROUND_MAIN",
  "2nd Floor": "SECOND",
  "3rd Floor": "THIRD",
  "4th Floor": "FOURTH",
  "5th Floor": "FIFTH",
  "6th+ Floor": "SIX_PLUS",
};

const ELEVATOR_BY_LABEL: Record<string, Elevator> = {
  Yes: "YES",
  No: "NO",
  "Both locations have elevator": "BOTH_LOCATIONS",
  "Origin only": "ORIGIN_ONLY",
  "Destination only": "DESTINATION_ONLY",
};

const STAIRS_BY_LABEL: Record<string, Stairs> = {
  "No stairs": "NO_STAIRS",
  "A few steps": "A_FEW_STEPS",
  "One full flight": "ONE_FULL_FLIGHT",
  "Multiple flights": "MULTIPLE_FLIGHTS",
};

const SERVICE_BY_LABEL: Record<string, Service> = {
  Moving: "MOVING",
  Packing: "PACKING",
  Unpacking: "UNPACKING",
  "Furniture Assembly": "FURNITURE_ASSEMBLY",
  "Heavy-Item Moving": "HEAVY_ITEM_MOVING",
  "Loading Only": "LOADING_ONLY",
  "Unloading Only": "UNLOADING_ONLY",
};

type QuoteFormState = {
  currentAddress: string;
  destinationAddress: string;
  movingDate: string;
  moveType: string;
  homeType: string;
  bedrooms: string;
  floor: string;
  elevator: string;
  stairs: string;
  services: string[];
  fullName: string;
  phone: string;
  email: string;
  notes: string;
};

interface LeadPayload {
  customer: {
    fullName: string;
    phone: string;
    email: string;
  };
  moveDetails: {
    movingFrom: string;
    movingTo: string;
    movingDate: string;
    moveType: MoveType;
    propertyType: PropertyType;
    bedrooms: Bedrooms;
    originFloor: OriginFloor;
    elevator?: Elevator;
    stairs?: Stairs;
  };
  services: Service[];
  additionalInformation: string;
}

function buildLeadPayload(form: QuoteFormState): LeadPayload {
  const moveDetails: LeadPayload["moveDetails"] = {
    movingFrom: form.currentAddress.trim(),
    movingTo: form.destinationAddress.trim(),
    movingDate: form.movingDate,
    moveType: MOVE_TYPE_BY_LABEL[form.moveType],
    propertyType: PROPERTY_TYPE_BY_LABEL[form.homeType],
    bedrooms: BEDROOMS_BY_LABEL[form.bedrooms],
    originFloor: ORIGIN_FLOOR_BY_LABEL[form.floor],
  };

  // Elevator and stairs are optional in the form. They are omitted when blank so
  // the backend never receives an empty string for an enum field.
  const elevator = ELEVATOR_BY_LABEL[form.elevator];
  if (elevator) moveDetails.elevator = elevator;
  const stairs = STAIRS_BY_LABEL[form.stairs];
  if (stairs) moveDetails.stairs = stairs;

  return {
    customer: {
      fullName: form.fullName.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
    },
    moveDetails,
    services: form.services
      .map((label) => SERVICE_BY_LABEL[label])
      .filter((value): value is Service => Boolean(value)),
    additionalInformation: form.notes.trim(),
  };
}

export default function Quote({ setPage: _setPage }: QuoteProps) {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [form, setForm] = useState<QuoteFormState>({
    currentAddress: "",
    destinationAddress: "",
    movingDate: "",
    moveType: "",
    homeType: "",
    bedrooms: "",
    floor: "",
    elevator: "",
    stairs: "",
    services: [] as string[],
    fullName: "",
    phone: "",
    email: "",
    notes: "",
  });

  const serviceOptions = [
    "Moving", "Packing", "Unpacking", "Furniture Assembly",
    "Heavy-Item Moving", "Loading Only", "Unloading Only",
  ];

  const toggleService = (s: string) => {
    setForm((f) => ({
      ...f,
      services: f.services.includes(s) ? f.services.filter((x) => x !== s) : [...f.services, s],
    }));
  };

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  // Guard against duplicate submissions while a request is already in flight.
  if (submitting) return;

  setSubmitting(true);
  setSubmitError(null);

  try {
    await apiClient.post<unknown>("/api/leads", buildLeadPayload(form));
    setSubmitted(true);
  } catch (error) {
    // The success screen is only ever shown for a confirmed API success.
    // Raw backend, validation, or network details are never shown to the
    // customer.
    setSubmitted(false);
    setSubmitError(
      error instanceof ApiError && error.isNetworkError
        ? "We could not reach our servers. Please check your connection and try again."
        : "Something went wrong while submitting your quote. Please try again."
    );
  } finally {
    setSubmitting(false);
  }
};

  const field = (
    label: string,
    key: keyof typeof form,
    type = "text",
    placeholder = "",
    required = true
  ) => (
    <div>
      <label className="block text-sm font-semibold text-[#0C2340] mb-1.5">
        {label}{required && <span className="text-[#F05A1A] ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={form[key] as string}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        placeholder={placeholder}
        required={required}
        className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-700 focus:outline-none focus:border-[#F05A1A] focus:ring-2 focus:ring-[#F05A1A]/10 transition-all"
      />
    </div>
  );

  const select = (label: string, key: keyof typeof form, options: string[], required = true) => (
    <div>
      <label className="block text-sm font-semibold text-[#0C2340] mb-1.5">
        {label}{required && <span className="text-[#F05A1A] ml-0.5">*</span>}
      </label>
      <select
        value={form[key] as string}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        required={required}
        className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-700 focus:outline-none focus:border-[#F05A1A] focus:ring-2 focus:ring-[#F05A1A]/10 transition-all bg-white"
      >
        <option value="">Select...</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] pt-32 flex items-center justify-center">
        <div className="max-w-lg mx-auto px-4 text-center py-16">
          <div className="w-20 h-20 rounded-full bg-[#F05A1A]/10 flex items-center justify-center mx-auto mb-6">
            <svg width="36" height="36" fill="none" stroke="#F05A1A" strokeWidth="2.5" viewBox="0 0 24 24">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <h2 className="font-display text-3xl font-bold text-[#0C2340] mb-4">Quote Request Received!</h2>
          <p className="text-slate-500 mb-8 leading-relaxed">
            Thank you, {form.fullName || "there"}! We've received your quote request and will get back to you within 24 hours to discuss your move.
          </p>
          <p className="text-slate-400 text-sm mb-8">In the meantime, feel free to call us directly at <a href="tel:+14039297209" className="text-[#F05A1A] font-semibold">(403) 929-7209</a>.</p>
          <button
            onClick={() => {
              setSubmitted(false);
              setSubmitError(null);
            }}
            className="bg-[#F05A1A] hover:bg-[#D44D12] text-white font-bold px-8 py-3.5 rounded text-sm tracking-wide transition-colors"
          >
            SUBMIT ANOTHER QUOTE
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <section className="bg-[#0C2340] pt-32 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <span className="text-[#F05A1A] font-semibold text-sm uppercase tracking-widest">No Obligation</span>
          <h1 className="font-display text-5xl sm:text-6xl font-bold text-white mt-3 mb-4">Get a Free Quote</h1>
          <p className="text-white/60 text-lg max-w-xl">
            Fill out the form below and we'll get back to you within 24 hours with a detailed quote for your move.
          </p>
        </div>
      </section>

      <section className="py-16 bg-[#F8FAFC]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <form onSubmit={handleSubmit} className="space-y-10">

            {/* Move Details */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-lg bg-[#F05A1A] flex items-center justify-center text-white text-sm font-bold">1</div>
                <h2 className="font-display text-xl font-bold text-[#0C2340]">Move Details</h2>
              </div>
              <div className="space-y-5">
                {field("Moving From (Current Address)", "currentAddress", "text", "123 Main St, Lethbridge, AB")}
                {field("Moving To (Destination Address)", "destinationAddress", "text", "456 Oak Ave, Calgary, AB")}
                {field("Moving Date", "movingDate", "date", "", true)}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {select("Type of Move", "moveType", moveTypes)}
                  {select("Property Type", "homeType", homeTypes)}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  {select("Number of Bedrooms", "bedrooms", bedrooms)}
                  {select("Floor Number (Origin)", "floor", ["Ground / Main Floor", "2nd Floor", "3rd Floor", "4th Floor", "5th Floor", "6th+ Floor"])}
                  {select("Elevator Available?", "elevator", ["Yes", "No", "Both locations have elevator", "Origin only", "Destination only"], false)}
                </div>
                {select("Stairs?", "stairs", ["No stairs", "A few steps", "One full flight", "Multiple flights"], false)}
              </div>
            </div>

            {/* Services */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-lg bg-[#F05A1A] flex items-center justify-center text-white text-sm font-bold">2</div>
                <h2 className="font-display text-xl font-bold text-[#0C2340]">Services Required</h2>
              </div>
              <p className="text-slate-400 text-sm mb-5">Select all that apply:</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {serviceOptions.map((s) => (
                  <button
                    type="button"
                    key={s}
                    onClick={() => toggleService(s)}
                    className={`border rounded-lg px-4 py-3 text-sm font-medium text-left transition-all ${
                      form.services.includes(s)
                        ? "border-[#F05A1A] bg-[#F05A1A]/5 text-[#F05A1A]"
                        : "border-slate-200 text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${
                        form.services.includes(s) ? "bg-[#F05A1A] border-[#F05A1A]" : "border-slate-300"
                      }`}>
                        {form.services.includes(s) && (
                          <svg width="10" height="10" fill="none" stroke="white" strokeWidth="3" viewBox="0 0 24 24">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        )}
                      </span>
                      {s}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Customer Info */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-lg bg-[#F05A1A] flex items-center justify-center text-white text-sm font-bold">3</div>
                <h2 className="font-display text-xl font-bold text-[#0C2340]">Your Information</h2>
              </div>
              <div className="space-y-5">
                {field("Full Name", "fullName", "text", "Jane Smith")}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {field("Phone Number", "phone", "tel", "(403) 555-0100")}
                  {field("Email Address", "email", "email", "jane@example.com")}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#0C2340] mb-1.5">Additional Information</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    placeholder="Anything else we should know? Special items, access restrictions, preferred time of day..."
                    rows={4}
                    className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-700 focus:outline-none focus:border-[#F05A1A] focus:ring-2 focus:ring-[#F05A1A]/10 transition-all resize-none"
                  />
                </div>
              </div>
            </div>

            {submitError && (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {submitError}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#F05A1A] hover:bg-[#D44D12] text-white font-bold py-5 rounded-lg text-sm tracking-widest transition-colors shadow-lg shadow-orange-900/20 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-[#F05A1A] disabled:active:scale-100"
            >
              {submitting ? "SENDING YOUR REQUEST…" : "REQUEST MY FREE QUOTE"}
            </button>
            <p className="text-center text-slate-400 text-xs">
              No commitment required. We'll respond within 24 hours — usually much sooner.
            </p>
          </form>
        </div>
      </section>
    </div>
  );
}
