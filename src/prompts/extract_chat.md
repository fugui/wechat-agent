Extract the last 5 chat messages from the screen. Ignore the sidebar.
Return JSON: { "messages": [{"sender": string, "content": string, "time": string}] }

If the message is an image, return "content": "[Image]",
if it is a video, return "content": "[Video]",
if it is a file, return "content": "[File]",
if it is a combined message, return "content": "[Combined]"
