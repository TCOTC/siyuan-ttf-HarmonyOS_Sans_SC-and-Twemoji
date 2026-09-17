> Recent update: support for the font configuration changes in SiYuan v3.8.2 and v3.8.3; Twemoji switched to a COLRv0 font file for WebKit compatibility

# HarmonyOS Sans and Twemoji

HarmonyOS Sans font files sourced from: [HarmonyOS Design Resources](https://developer.huawei.com/consumer/cn/design/resource/)/[Developer Documentation](https://developer.huawei.com/consumer/cn/doc/design-guides/font-0000001828772001). Converted from .ttf format to .woff format using [CloudConvert](https://cloudconvert.com/ttf-to-woff).

Twemoji font file sourced from: [TCOTC/twemoji-colr](https://github.com/TCOTC/twemoji-colr/)

### Notes

- This plugin may be incompatible with other font or Emoji plugins in the marketplace. Please disable other font or Emoji plugins when using this one.
- HarmonyOS Sans takes priority over the global default font and editor fonts selected in Settings - Appearance.
- With the "Editor only" scope, only the editor is affected and the UI keeps its original fonts.
- The font weight is pinned to 400, ignoring the weights of the fonts selected in Settings; bold text and headings keep their own weights.
- Inline font families set on text are not affected by this plugin and take priority.
- Chinese glyphs support Simplified Chinese only, not Traditional Chinese, because HarmonyOS Sans has incomplete Traditional Chinese glyphs.
