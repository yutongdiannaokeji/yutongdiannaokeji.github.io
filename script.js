const startButton = document.getElementById('startButton');
const textButton = document.getElementById('textButton');
const output = document.getElementById('output');
const textInput = document.getElementById('textInput');

startButton.addEventListener('click', () => {
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = 'zh-CN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.start();

    recognition.onresult = (event) => {
        const speechResult = event.results[0][0].transcript;
        handleInput(speechResult);
    };

    recognition.onerror = (event) => {
        output.textContent = `错误: ${event.error}`;
    };
});

textButton.addEventListener('click', () => {
    const textResult = textInput.value;
    handleInput(textResult);
});

function handleInput(input) {
    output.textContent = `你说: ${input}`;

    // 检查用户是否询问时间
    if (input.includes('时间') || input.includes('几点')) {
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const timeString = `现在是${hours}点${minutes}分`;
        output.textContent += `\n${timeString}`;
    } else if (input.includes('天气')) {
        // 示例：返回固定的天气信息
        const weatherInfo = '今天的天气是晴天，气温25度。';
        output.textContent += `\n${weatherInfo}`;
    } else if (input.includes('讲个笑话')) {
        // 示例：返回一个笑话
        const joke = '为什么某些东西不怕simuqin，因为它们没有';
        output.textContent += `\n${joke}`;
    } else if (input.includes('设置提醒')) {
        // 示例：返回固定的提醒信息
        const reminder = '好的，已经为你设置了提醒（jiade）。';
        output.textContent += `\n${reminder}`;
    } else {
        output.textContent += '\n我不知道，请询问开发组成员史东福。';
    }
}
