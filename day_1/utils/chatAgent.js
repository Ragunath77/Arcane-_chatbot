const chatAgent = async (userMessage, chatHistory) => {
    try {
        const historyText = chatHistory.map(msg => 
            `${msg.role === 'user' ? 'User' : 'Chitti'}: ${msg.content}`
        ).join('\n');

        const systemPrompt = `You are Chitti, a helpful, knowledgeable, and friendly AI assistant. 
Provide clear, accurate, and helpful responses to user questions. Always respond as Chitti.

Chat History:
${historyText}`;

        const response = await invokeAIAgent(systemPrompt, userMessage);
        return response;
    } catch (error) {
        console.error('Chat agent error:', error);
        throw new Error('Failed to get AI response. Please try again.');
    }
};
