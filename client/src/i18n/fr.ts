import type { Dict } from './types';
export const dict: Dict = {
  "common": {
    "back": "Retour",
    "cancel": "Annuler",
    "close": "Fermer",
    "confirm": "Confirmer",
    "loading": "Chargement...",
    "save": "Enregistrer",
    "delete": "Supprimer",
    "edit": "Modifier",
    "add": "Ajouter",
    "remove": "Retirer",
    "optional": "facultatif",
    "yes": "Oui",
    "no": "Non",
    "saved": "Enregistré",
    "saving": "Enregistrement...",
    "new": "Nouveau",
    "update": "Mettre à jour"
  },
  "language": {
    "label": "Langue"
  },
  "builder": {
    "sections": {
      "template": "Modèle",
      "personal": "Personnel",
      "summary": "Résumé",
      "experience": "Expérience",
      "education": "Formation",
      "skills": "Compétences",
      "languages": "Langues",
      "projects": "Projets",
      "certificates": "Certificats"
    },
    "actions": {
      "undo": "Annuler (⌘Z)",
      "redo": "Refaire (⌘⇧Z)",
      "clear": "Recommencer",
      "clearConfirm": "Recommencer avec un CV vierge ? Le contenu, les pièces jointes et le design seront réinitialisés. Vous pouvez annuler avec Ctrl/⌘+Z."
    }
  },
  "personal": {
    "fullName": "Nom complet",
    "headline": "Titre / Headline",
    "email": "E-mail",
    "phone": "Téléphone",
    "location": "Localisation",
    "website": "Site web",
    "linkedin": "LinkedIn",
    "github": "GitHub",
    "photo": "Photo (facultatif)",
    "photoPlaceholder": "sans photo",
    "photoChoose": "Choisir une photo",
    "photoChange": "Changer de photo",
    "photoProcessing": "Traitement...",
    "photoHelp": "JPG, PNG ou WebP. Redimensionnée à 480×480.",
    "accent": "Couleur d'accent",
    "custom": "Personnalisé",
    "invalidHex": "Couleur invalide — utilisez #rrggbb.",
    "invalidEmail": "Le format e-mail semble invalide."
  },
  "certificates": {
    "title": "Certificats (PDF)",
    "help": "Joignez diplômes et certifications en PDF. Ils apparaissent à la fin du CV. Jusqu'à 10 Mo par fichier · 50 Mo total · PDF uniquement.",
    "empty": "Aucun certificat.",
    "addCta": "Ajouter un certificat",
    "name": "Nom",
    "namePlaceholder": "Cours X — Université Y",
    "description": "Description (facultatif)",
    "sizeLabel": "{size} · {pages} {pageLabel}",
    "page": "page",
    "pages": "pages",
    "totalLabel": "Total : {total} sur {cap}",
    "framed": "Cadre OpenCV",
    "framedHelp": "Insère le certificat dans une page aux couleurs et en-tête du CV.",
    "dragHandle": "Glisser pour réorganiser",
    "quotaWarn": "Total au-dessus de 5 Mo — la sauvegarde auto du navigateur peut échouer. Pensez à retirer les gros fichiers ou à payer et télécharger avant d'en ajouter d'autres.",
    "errTooLarge": "Fichier supérieur à 10 Mo.",
    "errTotalCap": "Dépasse 50 Mo au total.",
    "errEncrypted": "PDF chiffré / protégé par mot de passe non supporté.",
    "errBadPdf": "Fichier PDF invalide."
  }
};
