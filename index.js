// module.exports = class PluginHarmonyOSSansTwemoji extends require('siyuan').Plugin {};

module.exports = class PluginHarmonyOSSansTwemoji extends require('siyuan').Plugin {
    onload() {
        console.log("siyuan-ttf-HarmonyOS_Sans_SC-and-Twemoji: loaded");

        // 创建 style 元素
        const styleElement = document.createElement('style');
        styleElement.id = 'snippetCSS-HarmonyOSSansTwemoji'; // id 以 snippet 开头的 style 会被添加到导出 PDF 中 https://github.com/siyuan-note/siyuan/commit/4318aa446369eaf4ea85982ba4919b5d47340552

        // 插入到 head 中
        document.head.appendChild(styleElement);

        // 获取 CSS 文件内容
        fetch('../plugins/siyuan-ttf-HarmonyOS_Sans_SC-and-Twemoji/style.css')
            .then(response => {
                if (!response.ok) {
                    throw new Error('siyuan-ttf-HarmonyOS_Sans_SC-and-Twemoji: Failed to load CSS file');
                }
                return response.text();
            })
            .then(cssText => {
                // 将 CSS 文本插入到 style 元素中
                styleElement.textContent = cssText;
            })
            .catch(error => {
                console.error('siyuan-ttf-HarmonyOS_Sans_SC-and-Twemoji: Error loading CSS:', error);
            });
    }

    onunload() {
        // 移除 style 元素
        const styleElement = document.getElementById('snippetCSS-HarmonyOSSansTwemoji');
        if (styleElement) {
            styleElement.remove();
        }
        
        console.log("siyuan-ttf-HarmonyOS_Sans_SC-and-Twemoji: unloaded");
    }

    uninstall() {
        // 在卸载时也移除 style 元素
        const styleElement = document.getElementById('snippetCSS-HarmonyOSSansTwemoji');
        if (styleElement) {
            styleElement.remove();
        }
        
        console.log("siyuan-ttf-HarmonyOS_Sans_SC-and-Twemoji: uninstall");
    }
}
