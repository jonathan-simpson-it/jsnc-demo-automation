"use client";

import { useState } from "react";

export default function ContactForm() {
  const [sent, setSent] = useState(false);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setSent(true);
        window.setTimeout(() => {
          setSent(false);
          (e.target as HTMLFormElement).reset();
        }, 3000);
      }}
      style={{ display: "grid", gap: "1.25rem" }}
    >
      <div className="contact-form-field">
        <label htmlFor="name">Name</label>
        <input type="text" id="name" name="name" required placeholder="Your name" />
      </div>
      <div className="contact-form-field">
        <label htmlFor="email">Email</label>
        <input type="email" id="email" name="email" required placeholder="you@company.com" />
      </div>
      <div className="contact-form-field">
        <label htmlFor="company">Company</label>
        <input type="text" id="company" name="company" placeholder="Company name" />
      </div>
      <div className="contact-form-field">
        <label htmlFor="message">How can we help?</label>
        <textarea id="message" name="message" required placeholder="Tell us about your project..." />
      </div>
      <div>
        <button type="submit" className="button button--solid">
          {sent ? "Message sent!" : "Send message"}
        </button>
      </div>
    </form>
  );
}
