// module.exports = class PluginHarmonyOSSansTwemoji extends require('siyuan').Plugin {};
let bodyObserver = null; // 声明 bodyObserver 为模块级变量

module.exports = class PluginHarmonyOSSansTwemoji extends require('siyuan').Plugin {
    onload() {
        console.log("siyuan-ttf-HarmonyOS_Sans_SC-and-Twemoji: loaded");

        const isMobile = () => {
            return !!window.siyuan?.mobile;
        };
        
        // 引入 @font-face
        const fetchFontFace = async () => {
            // 创建 style 元素
            const styleElement = document.createElement('style');
            styleElement.id = 'snippetCSS-HarmonyOSSansTwemoji-font-face'; // id 以 snippet 开头的 style 会被添加到导出 PDF 中 https://github.com/siyuan-note/siyuan/commit/4318aa446369eaf4ea85982ba4919b5d47340552
    
            // 插入到 head 中
            document.head.appendChild(styleElement);

            await fetch('../plugins/siyuan-ttf-HarmonyOS_Sans_SC-and-Twemoji/font-face.css')
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
            
            document.querySelector('#snippetCSS-HarmonyOSSansTwemoji-style-for-export-image')?.remove();
        };
        // 使用 style 样式
        const fetchStyle = async () => {
            // 创建 style 元素
            const styleElement = document.createElement('style');
            styleElement.id = 'snippetCSS-HarmonyOSSansTwemoji-style'; // id 以 snippet 开头的 style 会被添加到导出 PDF 中 https://github.com/siyuan-note/siyuan/commit/4318aa446369eaf4ea85982ba4919b5d47340552
    
            // 插入到 head 中
            document.head.appendChild(styleElement);

            await fetch('../plugins/siyuan-ttf-HarmonyOS_Sans_SC-and-Twemoji/style.css')
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
            
            document.querySelector('#snippetCSS-HarmonyOSSansTwemoji-style-for-export-image')?.remove();
        };
        // 使用 style-for-export-image 样式
        const fetchStyleForExportImage = async () => {
            // 创建 style 元素
            const styleElement = document.createElement('style');
            styleElement.id = 'snippetCSS-HarmonyOSSansTwemoji-style-for-export-image'; // id 以 snippet 开头的 style 会被添加到导出 PDF 中 https://github.com/siyuan-note/siyuan/commit/4318aa446369eaf4ea85982ba4919b5d47340552
    
            // 插入到 head 中
            document.head.appendChild(styleElement);

            await fetch('../plugins/siyuan-ttf-HarmonyOS_Sans_SC-and-Twemoji/style-for-export-image.css')
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
            
            document.querySelector('#snippetCSS-HarmonyOSSansTwemoji-style')?.remove();
        };

        fetchFontFace();
        // 启用插件时可能正在导出图片，预先处理
        if (document.querySelector('.b3-dialog--open[data-key="dialog-exportimage"]')) {
            if (isMobile()) {
                fetchStyle();
                return;
            }
            fetchStyleForExportImage();
        } else {
            fetchStyle();
        }

        // 功能：监听 body 元素的子元素增删
        (async () => {
            if (isMobile()) return;


            // 监听 body 元素的直接子元素变化
            bodyObserver = new MutationObserver((mutationsList) => {
                mutationsList.forEach((mutation) => {
                    // 处理添加的节点
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            setTimeout(() => {
                                // 弹出导出图片窗口
                                if (node.classList.contains('b3-dialog--open') && node.dataset.key === "dialog-exportimage") {
                                    fetchStyleForExportImage();
                                }
                            });
                        }
                    });

                    // 处理移除的节点
                    mutation.removedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            // 关闭导出图片窗口
                            if (node.classList.contains('b3-dialog--open') && node.dataset.key === "dialog-exportimage") {
                                fetchStyle();
                            }
                        }
                    });
                });
            });

            // 观察 body 元素子节点的变化
            bodyObserver.observe(document.body, { childList: true });
        })();
    }

    onunload() {
        bodyObserver?.disconnect();
        // 移除 style 元素
        const styleElement = document.getElementById('snippetCSS-HarmonyOSSansTwemoji-style') || document.getElementById('snippetCSS-HarmonyOSSansTwemoji-style-for-export-image');
        if (styleElement) {
            styleElement.remove();
        }

        const fontFaceElement = document.getElementById('snippetCSS-HarmonyOSSansTwemoji-font-face');
        if (fontFaceElement) {
            fontFaceElement.remove();
        }
        
        console.log("siyuan-ttf-HarmonyOS_Sans_SC-and-Twemoji: unloaded");
    }

    uninstall() {
        bodyObserver?.disconnect();
        // 在卸载时也移除 style 元素
        const styleElement = document.getElementById('snippetCSS-HarmonyOSSansTwemoji-style') || document.getElementById('snippetCSS-HarmonyOSSansTwemoji-style-for-export-image');
        if (styleElement) {
            styleElement.remove();
        }

        const fontFaceElement = document.getElementById('snippetCSS-HarmonyOSSansTwemoji-font-face');
        if (fontFaceElement) {
            fontFaceElement.remove();
        }
        
        console.log("siyuan-ttf-HarmonyOS_Sans_SC-and-Twemoji: uninstall");
    }
}
