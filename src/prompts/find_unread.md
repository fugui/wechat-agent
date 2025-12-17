Analyze the chat list (the middle column). Find all chat items that have a "Red Dot" or a "Number Badge" indicating unread messages.
Return a JSON object with a list of unread chats, including their approximate coordinates (center of the list item) and the name (if readable).
JSON Format:
{
"unreadChats": [
{
"name": "string (or 'unknown')",
"x": number,
"y": number,
"badgeCount": "number (or 'dot')"
}
]
}
If no unread chats are found, return { "unreadChats": [] }.
Ignore the selected chat (highlighted). Only look for red badges.
