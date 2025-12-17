Analyze the chat window. Focus on the most recent message (at the bottom).

1. Identify if the last message is on the _right_ side (sent by the user) or _left_ side.
2. If it is on the right, check for any error indicators (e.g., a red exclamation mark '!') or "Sending" spinners next to it.
3. Return JSON:
   {
   "lastMessageSide": "left" | "right",
   "isSuccess": boolean,
   "hasError": boolean,
   "content": "string (summary of the message)"
   }
