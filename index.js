module.exports = class F extends require('siyuan').Plugin {
    t = 'HarmonyOS Sans and Twemoji: ';

    onload() {
        setTimeout(() => {
            if (!document.fonts || typeof document.fonts.load !== 'function') return;
            try {
                // 预加载 HarmonyOS Sans 的四种变体
                document.fonts.load('400 16px "HarmonyOS Sans"', '1');
                document.fonts.load('700 16px "HarmonyOS Sans"', '2');
                document.fonts.load('italic 400 16px "HarmonyOS Sans"', '3');
                document.fonts.load('italic 700 16px "HarmonyOS Sans"', '4');
            } catch (_) {}
            console.log(this.t + 'loaded');
        }, 0);
    }

    onunload() {
        console.log(this.t + 'unloaded');
    }

    uninstall() {
        console.log(this.t + 'uninstall');
    }
}