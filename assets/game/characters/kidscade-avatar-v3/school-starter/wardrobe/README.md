# Wardrobe and face parts

- Upper: hoodie, short/long puffer, box tee, leather/denim/suit/baseball jackets.
- Lower: pleated tennis skirt, textured jeans, cotton trousers.
- Eyes: eight iris colors and six makeup/anime styles in the existing eyes catalog.
- Independent face decoration, hat and mouth slots; face decorations and hats include a none option.

Clothing and face/hat/mouth files use the existing `kidscade-avatar-full-adjustment`
contract, with explicit integer RGBA pixels for all 23 frames. They can be imported
through the administrator's full/part JSON adjustment tool. No file changes BODY.
Eye files use the existing eye-part contract and its established frame transforms.

The public shop exposes catalog choices only. Explicit clothing replaces the corresponding
baked/default clothing layer; old palette-only choices continue to work. Lower is drawn
before upper so coat hems cover trousers. Face decorations follow facial parts, and hats
follow hair. Equipment retains the existing front/back passes.

`body-fallback.png` is a raster copy of the original reference BODY frames, used only if
loading the normal BODY sources fails. It avoids exposing remnants of default clothing.
