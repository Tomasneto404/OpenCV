import type { Dict } from './types';
export const dict: Dict = {
  "common": {
    "back": "Volver",
    "cancel": "Cancelar",
    "close": "Cerrar",
    "confirm": "Confirmar",
    "loading": "Cargando...",
    "save": "Guardar",
    "delete": "Eliminar",
    "edit": "Editar",
    "add": "Añadir",
    "remove": "Quitar",
    "optional": "opcional",
    "yes": "Sí",
    "no": "No",
    "saved": "Guardado",
    "saving": "Guardando...",
    "new": "Nuevo",
    "update": "Actualizar"
  },
  "language": {
    "label": "Idioma"
  },
  "builder": {
    "sections": {
      "template": "Plantilla",
      "personal": "Personal",
      "summary": "Resumen",
      "experience": "Experiencia",
      "education": "Formación",
      "skills": "Habilidades",
      "languages": "Idiomas",
      "projects": "Proyectos",
      "certificates": "Certificados"
    },
    "actions": {
      "undo": "Deshacer (⌘Z)",
      "redo": "Rehacer (⌘⇧Z)",
      "clear": "Empezar de nuevo",
      "clearConfirm": "¿Empezar con un CV en blanco? Se restablecerán el contenido, los archivos adjuntos y el diseño. Puedes deshacer con Ctrl/⌘+Z."
    }
  },
  "personal": {
    "fullName": "Nombre completo",
    "headline": "Título / Headline",
    "email": "Email",
    "phone": "Teléfono",
    "location": "Ubicación",
    "website": "Web",
    "linkedin": "LinkedIn",
    "github": "GitHub",
    "photo": "Foto (opcional)",
    "photoPlaceholder": "sin foto",
    "photoChoose": "Elegir foto",
    "photoChange": "Cambiar foto",
    "photoProcessing": "Procesando...",
    "photoHelp": "JPG, PNG o WebP. Redimensionada a 480×480.",
    "accent": "Color de acento",
    "custom": "Personalizado",
    "invalidHex": "Color inválido — usa #rrggbb.",
    "invalidEmail": "El formato del email parece inválido."
  },
  "certificates": {
    "title": "Certificados (PDF)",
    "help": "Adjunta diplomas y certificaciones en PDF. Aparecen al final del CV. Hasta 10 MB por fichero · 50 MB total · solo PDF.",
    "empty": "Sin certificados.",
    "addCta": "Añadir certificado",
    "name": "Nombre",
    "namePlaceholder": "Curso X — Universidad Y",
    "description": "Descripción (opcional)",
    "sizeLabel": "{size} · {pages} {pageLabel}",
    "page": "página",
    "pages": "páginas",
    "totalLabel": "Total: {total} de {cap}",
    "framed": "Marco OpenCV",
    "framedHelp": "Inserta el certificado dentro de una página con el color y cabecera del CV.",
    "dragHandle": "Arrastrar para reordenar",
    "quotaWarn": "Total por encima de 5 MB — el auto-guardado del navegador puede fallar. Considera quitar archivos grandes o pagar y descargar antes de añadir más.",
    "errTooLarge": "Fichero mayor de 10 MB.",
    "errTotalCap": "Excede 50 MB en total.",
    "errEncrypted": "PDF cifrado / con contraseña no soportado.",
    "errBadPdf": "Fichero PDF inválido."
  }
};
