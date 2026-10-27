import type { Dict } from './types';
export const dict: Dict = {
  "common": {
    "back": "Back",
    "cancel": "Cancel",
    "close": "Close",
    "confirm": "Confirm",
    "loading": "Loading...",
    "save": "Save",
    "delete": "Delete",
    "edit": "Edit",
    "add": "Add",
    "remove": "Remove",
    "optional": "optional",
    "yes": "Yes",
    "no": "No",
    "saved": "Saved",
    "saving": "Saving...",
    "new": "New",
    "update": "Update"
  },
  "language": {
    "label": "Language"
  },
  "builder": {
    "sections": {
      "template": "Template",
      "personal": "Personal",
      "summary": "Summary",
      "experience": "Experience",
      "education": "Education",
      "skills": "Skills",
      "languages": "Languages",
      "projects": "Projects",
      "certificates": "Certificates"
    },
    "actions": {
      "undo": "Undo (⌘Z)",
      "redo": "Redo (⌘⇧Z)",
      "clear": "Start over",
      "clearConfirm": "Start over with a blank CV? Content, attachments and design will be reset. You can undo with Ctrl/⌘+Z."
    }
  },
  "personal": {
    "fullName": "Full name",
    "headline": "Title / Headline",
    "email": "Email",
    "phone": "Phone",
    "location": "Location",
    "website": "Website",
    "linkedin": "LinkedIn",
    "github": "GitHub",
    "photo": "Photo (optional)",
    "photoPlaceholder": "no photo",
    "photoChoose": "Choose photo",
    "photoChange": "Change photo",
    "photoProcessing": "Processing...",
    "photoHelp": "JPG, PNG or WebP. Resized to 480×480.",
    "accent": "Accent colour",
    "custom": "Custom",
    "invalidHex": "Invalid colour — use #rrggbb.",
    "invalidEmail": "Email format looks off."
  },
  "certificates": {
    "title": "Certificates (PDF)",
    "help": "Attach diplomas / certifications as PDF. They appear at the end of the CV. Up to 10 MB per file · 50 MB total · PDF only.",
    "empty": "No certificates.",
    "addCta": "Add certificate",
    "name": "Name",
    "namePlaceholder": "Course X — University Y",
    "description": "Description (optional)",
    "sizeLabel": "{size} · {pages} {pageLabel}",
    "page": "page",
    "pages": "pages",
    "totalLabel": "Total: {total} of {cap}",
    "framed": "OpenCV frame",
    "framedHelp": "Embed the certificate inside a CV-themed page (accent colour + header).",
    "dragHandle": "Drag to reorder",
    "quotaWarn": "Total above 5 MB — browser auto-save may fail. Consider removing large files or paying and downloading before adding more.",
    "errTooLarge": "File larger than 10 MB.",
    "errTotalCap": "Exceeds 50 MB total.",
    "errEncrypted": "Encrypted / password-protected PDFs are not supported.",
    "errBadPdf": "Invalid PDF file."
  }
};
