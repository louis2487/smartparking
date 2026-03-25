const { withMainActivity } = require('@expo/config-plugins');

function addKotlinOverride(src) {
  if (src.includes('override fun onSaveInstanceState(')) return src;

  const anchor = 'class MainActivity';
  const idx = src.indexOf(anchor);
  if (idx === -1) return src;

  const braceIdx = src.indexOf('{', idx);
  if (braceIdx === -1) return src;

  const injection =
    '\n' +
    '  override fun onSaveInstanceState(outState: android.os.Bundle) {\n' +
    '    super.onSaveInstanceState(android.os.Bundle())\n' +
    '  }\n';

  return src.slice(0, braceIdx + 1) + injection + src.slice(braceIdx + 1);
}

function addJavaOverride(src) {
  if (src.includes('void onSaveInstanceState(')) return src;

  const anchor = 'class MainActivity';
  const idx = src.indexOf(anchor);
  if (idx === -1) return src;

  const braceIdx = src.indexOf('{', idx);
  if (braceIdx === -1) return src;

  const injection =
    '\n' +
    '  @Override\n' +
    '  protected void onSaveInstanceState(android.os.Bundle outState) {\n' +
    '    super.onSaveInstanceState(new android.os.Bundle());\n' +
    '  }\n';

  return src.slice(0, braceIdx + 1) + injection + src.slice(braceIdx + 1);
}

module.exports = function withDisableOnSaveInstanceState(config) {
  return withMainActivity(config, (config) => {
    const lang = config.modResults.language;
    const contents = config.modResults.contents;

    if (lang === 'java') {
      config.modResults.contents = addJavaOverride(contents);
      return config;
    }

    config.modResults.contents = addKotlinOverride(contents);
    return config;
  });
};

