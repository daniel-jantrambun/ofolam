import type { FaqDoc } from "./en";

export const faqEs: FaqDoc = {
  title: "Preguntas frecuentes",
  intro: "Cómo trata Ofolam tus datos y cómo publicar lo que creas.",
  back: "Volver a la app",
  sections: [
    {
      heading: "Tus datos",
      items: [
        {
          q: "¿Qué guarda Ofolam sobre mí?",
          a: [
            "Tu identificador de atleta de Strava, tu nombre y tu país, además de los tokens que Strava nos entrega para leer tus actividades, cifrados. También se guardan las plantillas que creas.",
            "No hay analítica, ni publicidad, ni rastreo.",
          ],
        },
        {
          q: "¿Cuánto tiempo se conservan mis datos?",
          a: [
            "Mientras tengas una sesión activa. Al cerrar tu última sesión se eliminan de inmediato tu registro, tus tokens y tus plantillas.",
            "Una sesión sin uso durante 90 días se elimina automáticamente, y tu registro con ella cuando ya no queda ninguna sesión. Si revocas el acceso de Ofolam en Strava, tu registro se elimina en cuanto la app lo detecta.",
          ],
        },
        {
          q: "¿Se almacenan mis actividades?",
          a: [
            "Se leen de Strava cuando usas la app y se guardan en caché para respetar los límites de Strava: 5 minutos para la lista y hasta 24 horas para una actividad. Tu dispositivo también conserva una copia para que la app se abra al instante.",
            "«Actualizar desde Strava», en el menú, se salta ambas cachés.",
          ],
        },
        {
          q: "¿Se suben mis fotos y vídeos a algún sitio?",
          a: [
            "No. La imagen se dibuja en tu navegador: las fotos y los vídeos nunca salen de tu dispositivo.",
            "Solo el fondo Mapa llama a un servicio externo (Stadia Maps), que recibe la zona de tu recorrido y tu dirección IP, como cualquier mapa en línea.",
          ],
        },
        {
          q: "¿Cómo lo elimino todo?",
          a: [
            "Cierra sesión. Si es tu última sesión, todo se elimina de una vez. También puedes revocar el acceso desde los ajustes de Strava (Mis aplicaciones) o escribir a {email}.",
          ],
        },
      ],
    },
    {
      heading: "Publicar",
      items: [
        {
          q: "¿Cómo publico en mi historia de Instagram?",
          a: [
            "Elige el formato Historia 9:16, toca Compartir y luego Instagram. En un ordenador, descarga la imagen y envíala a tu teléfono.",
            "Activa la zona visible de Instagram para que tus textos no queden debajo de la interfaz de Instagram.",
          ],
        },
        {
          q: "¿Para qué sirve el fondo Sticker?",
          a: [
            "Exporta la tarjeta con fondo transparente. Cópiala y pégala sobre una foto o un vídeo en el editor de historias de Instagram. Así conservas las herramientas de Instagram para la foto de debajo.",
          ],
        },
        {
          q: "¿Cómo creo un carrusel?",
          a: [
            "Elige el fondo Imagen y añade imágenes, hasta 10: fotos, un mapa o un color liso claro u oscuro. Los mismos textos y el mismo recorrido se dibujan sobre cada una. Arrastra las miniaturas para cambiar su orden.",
            "Con las flechas que hay bajo la vista previa, pasa de una imagen a otra para comprobar que los textos se leen bien en todas. Cada imagen conserva sus propios ajustes (encuadre para una foto, estilo para un mapa, color para un fondo liso); los textos y el recorrido mantienen la misma posición en todas, así que mover un elemento lo mueve en todas.",
            "Después, Compartir envía todas las imágenes a la vez e Instagram las ofrece como una sola publicación. «Descargar las imágenes», en el menú, las guarda todas, numeradas en orden.",
          ],
        },
        {
          q: "¿Qué formato para cada uso?",
          a: [
            "Historia 9:16 para historias y reels. Publicación 4:5 para el feed de Instagram y los carruseles. Cuadrado 1:1 sirve en todas partes. Horizontal 16:9 para X, Facebook o un blog.",
          ],
        },
        {
          q: "¿Puedo publicar un vídeo?",
          a: [
            "Sí. Elige el fondo Vídeo, selecciona un fragmento de hasta 60 segundos y toca Crear el vídeo. El vídeo se codifica en tu dispositivo; después puedes compartirlo o descargarlo.",
          ],
        },
        {
          q: "¿Puedo ocultar dónde vivo?",
          a: [
            "Sí. Selecciona el recorrido y usa «Ocultar inicio y final»: la distancia que elijas se quita en los dos extremos del recorrido.",
          ],
        },
      ],
    },
    {
      heading: "La aplicación",
      items: [
        {
          q: "¿Cómo instalo Ofolam en mi teléfono?",
          a: [
            "Ofolam se instala desde el navegador, sin pasar por una tienda: usa «Instalar la app» en el menú. En iPhone, abre el sitio en Safari, toca Compartir y luego «Añadir a pantalla de inicio».",
          ],
        },
        {
          q: "No aparece una actividad nueva. ¿Qué hago?",
          a: [
            "La lista se guarda en caché 5 minutos. «Actualizar desde Strava», en el menú, la recarga al momento.",
          ],
        },
        {
          q: "¿Qué son las plantillas?",
          a: [
            "Una plantilla es un diseño: qué elementos se muestran, dónde y con qué estilo. Nunca cambia tu fondo ni tu formato.",
            "Puedes guardar hasta 20 plantillas propias con «Guardar el diseño actual como plantilla».",
          ],
        },
        {
          q: "¿Ofolam es gratis?",
          coffee: "Si te gusta, puedes apoyar el proyecto:",
          a: ["Sí, gratis y sin publicidad. Es un proyecto independiente, sin relación con Strava."],
        },
      ],
    },
  ],
};
