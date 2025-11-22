// Chat domain service: orchestrates response generation.
// Replace the mock with your LLM or RAG pipeline.

export async function generateReply({ message, resumeText = '', sessionId }) {
  // Example: trivial mock that references resume length
  const intro = resumeText
    ? `I have ${resumeText.length.toLocaleString()} characters of resume context. `
    : '';
  const reply = `${intro}You said: "${message}"`;
  return { reply };
}



