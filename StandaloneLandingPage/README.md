# Standalone landing page

Serve this folder with a local web server (for example, run `python3 -m http.server 8000` from this folder, then open `http://localhost:8000`). WebGL image textures may be blocked when opening the file directly. The folder is self-contained and can be zipped for the developer. This is an initial visual pass, not a final WordPress integration.

The supplied 3918 × 5766 JPEG is drawn as the poster, with the logos and caption separate and fixed to the viewport. When audio plays, a full-device-resolution WebGL canvas distorts the JPEG vertically using the cloud map from the previous audio experiment. This version applies the effect across the poster rather than using the spiral path mask. The test panel allows selection of a local audio file and adjustment of volume, effect strength and threshold. The bundled sample is for testing; replace it for the final page. The artwork is flat, so all parts of the JPEG distort together. On devices with a smaller maximum texture size, the WebGL texture is scaled down to fit the device.

The Mailchimp form, final ticket link and audio interaction are not yet configured. Obtain the actual Mailchimp embed and destination URL before connecting them. Test the eventual deployment on the target host, including font and asset paths, mobile sizing and the form.
