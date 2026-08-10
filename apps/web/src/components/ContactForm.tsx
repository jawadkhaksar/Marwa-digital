"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { PhoneInputWithCountry } from "@marwa/builder/react";
import { isValidPhone } from "@marwa/builder";
import { api } from "@/lib/api";
import { getAttributionPayload } from "@/lib/analytics";
import { createFormFieldTracker } from "@/lib/formAnalytics";

const PHONE_FIELD_CLASS = "w-full rounded-lg bg-white px-4 py-3.5 text-sm text-black placeholder:text-black/30 focus:outline-none focus:ring-2 focus:ring-[#2563ff]/50";

export function ContactForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  // Bot defense: `website` is a honeypot real visitors never see or fill;
  // `renderedAt` timestamps when the form mounted, so the server can reject
  // submissions that arrive faster than a human could plausibly type.
  const [website, setWebsite] = useState("");
  const [renderedAt] = useState(() => Date.now());

  // Form Field Analytics — one tracker per mount, reporting which field a
  // visitor was last in if they leave without submitting.
  const trackerRef = useRef(createFormFieldTracker("contact-page"));
  useEffect(() => {
    const tracker = trackerRef.current;
    return () => tracker.destroy();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agreed) {
      setError("Please accept the Privacy Policy & Terms & Conditions.");
      return;
    }
    if (phone && !isValidPhone(phone)) {
      setError("Please enter a valid phone number.");
      return;
    }
    setError(null);
    setStatus("sending");
    try {
      await api.submitContactInquiry({
        name,
        email,
        phone: phone || undefined,
        subject: subject || undefined,
        message: message || undefined,
        website: website || undefined,
        renderedAt,
        ...getAttributionPayload(),
      });
      trackerRef.current.onSubmitSuccess();
      setStatus("sent");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Failed to send your request. Please try again.");
    }
  }

  if (status === "sent") {
    return (
      <div id="contact-form" className="rounded-3xl bg-[#f9f9f9] p-8 text-center md:p-10">
        <h3 className="text-xl font-bold text-black">Request received</h3>
        <p className="mt-2 text-sm text-black/60">
          Thank you, {name || "there"} — we&apos;ll get back to you shortly.
        </p>
      </div>
    );
  }

  return (
    <form
      id="contact-form"
      onSubmit={handleSubmit}
      className="flex flex-col gap-5 rounded-3xl bg-[#F8F8F8] p-6 md:p-8"
    >
      <div>
        <h3 className="text-xl font-bold text-black">Get in Touch</h3>
        <div className="mt-2 h-1 w-10 rounded-full bg-[#2563ff]" />
      </div>

      {/* Honeypot — off-screen, not display:none (some bots specifically skip fields hidden that way). Real visitors never see or reach it. */}
      <input
        type="text"
        name="website"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ position: "absolute", left: "-9999px", top: "-9999px", width: 1, height: 1, opacity: 0 }}
      />

      <div className="mt-2 grid gap-5 sm:grid-cols-2">
        <Field label="Name" value={name} onChange={setName} placeholder="Max Charlie K." required onFocus={() => trackerRef.current.onFieldFocus("name", "Name")} />
        <div onFocusCapture={() => trackerRef.current.onFieldFocus("phone", "Phone")}>
          <label className="mb-2 block text-sm font-semibold text-black">Phone</label>
          <PhoneInputWithCountry
            value={phone}
            onChange={setPhone}
            inputClassName={PHONE_FIELD_CLASS}
            dropdownClassName="border-black/10 bg-white text-black"
            dropdownItemHoverClassName="hover:bg-black/5"
            dropdownItemSelectedClassName="bg-black/5"
          />
        </div>
      </div>

      <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="name@domain.com" required onFocus={() => trackerRef.current.onFieldFocus("email", "Email")} />

      <Field label="Subject" value={subject} onChange={setSubject} placeholder="What can we help with?" onFocus={() => trackerRef.current.onFieldFocus("subject", "Subject")} />

      <div>
        <label className="mb-2 block text-sm font-semibold text-black">Message</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onFocus={() => trackerRef.current.onFieldFocus("message", "Message")}
          rows={4}
          placeholder="Write your message"
          className="w-full resize-none rounded-lg bg-white px-4 py-3.5 text-sm text-black placeholder:text-black/30 focus:outline-none focus:ring-2 focus:ring-[#2563ff]/50"
        />
      </div>

      <label className="mt-2 flex items-start gap-3 text-xs text-black/70">
        <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#2563ff] focus:ring-[#2563ff]" />
        <span>
          I have read and accept the <Link href="/privacy-policy" className="font-semibold text-black underline hover:text-[#2563ff]">Privacy Policy</Link> &{" "}
          <Link href="/terms-and-conditions" className="font-semibold text-black underline hover:text-[#2563ff]">Terms &amp; Conditions</Link>
        </span>
      </label>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={status === "sending"}
        className="mt-2 rounded-lg bg-[#2563ff] px-4 py-4 text-sm font-bold text-black transition-transform hover:-translate-y-0.5 hover:bg-[#1d4fd8] disabled:opacity-50"
      >
        {status === "sending" ? "Sending…" : "Submit"}
      </button>
    </form>
  );
}

function Field({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  required,
  onFocus,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  onFocus?: () => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-black">{label}</label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        placeholder={placeholder}
        className="w-full rounded-lg bg-white px-4 py-3.5 text-sm text-black placeholder:text-black/30 focus:outline-none focus:ring-2 focus:ring-[#2563ff]/50"
      />
    </div>
  );
}
