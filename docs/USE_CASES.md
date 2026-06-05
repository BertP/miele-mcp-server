# 🍳 Your Smart Sous-Chef: The Miele MCP Server for AI Agents

Imagine sitting in your living room or out and about, chatting with your preferred AI (like Claude). You wonder whether the laundry is done or what you could cook with the leftovers in the fridge — and the AI not only knows the answer but actually checks for you, preheats the oven, or pulls up a live image of your roast!

That is exactly what this **Miele MCP Server** makes possible. It acts as an invisible interpreter between your AI and your Miele home appliances.

---

## 🌟 What can the AI do thanks to the server?

Once you connect the server to your AI (e.g. in Claude Desktop), the AI gains entirely new "skills" (tools). It can then access your Miele appliances in real time.

Here are a few concrete examples of what you can ask your AI or have it do for you:

### 1. 🔍 Appliance inventory & status queries
The AI can list all your connected appliances and check their current state.
* **You ask:** *"Claude, which of my Miele appliances are running right now?"*
* **The AI does:** It calls the `list_devices` tool, sees for example that the oven (H7860BP) and the washing machine (WCR890) are online. It then uses `get_device_state` to respond: *"The washing machine is currently running the 'Cotton' program and will be done in 24 minutes. The oven is on standby."*

### 2. 📸 Live images from the oven (FoodView)
Does your oven have a built-in camera? The AI can take a look!
* **You ask:** *"Take a peek in the oven. Is the crust on the roast crispy enough?"*
* **The AI does:** It uses `get_device_camera`, downloads the latest image from the oven cavity, analyses it directly in the chat, and responds: *"The roast looks excellent! The crust has a beautiful golden-brown colour. I'd recommend taking it out in 10 minutes."*

### 3. 🎮 Remote control & actions (Smart Home magic)
The AI can (with your permission and appliance support) execute actions.
* **You ask:** *"I'll be home in 30 minutes. Can you preheat the oven to 200°C top/bottom heat?"*
* **The AI does:** It uses `put_device_action` to switch on the oven and set the temperature, confirming: *"Done! The oven is now heating to 200°C."*

### 4. 🍽️ AI recipe planning with direct execution
Because the AI has access to your appliances' available programs, it becomes the ultimate kitchen assistant.
* **You ask:** *"I have salmon and asparagus. What's the best way to prepare them in my Miele steam oven?"*
* **The AI does:** It checks with `get_device_programs` which cooking programs your specific model supports. It then creates a recipe and asks: *"Shall I send the 'Steam Cooking' program for 15 minutes at 85°C directly to the steam oven?"*

---

## 🛠️ Which tools are available to the AI?

Technically, the server equips your AI with the following tools:

* `list_devices` — Finds all appliances and their IDs (washing machine, oven, coffee machine, etc.).
* `get_device_state` — Reads temperatures, remaining times, status (on/off/door open), and error codes.
* `get_device_programs` — Shows the AI which programs a device supports (e.g. espresso, intensive 75°C, convection plus).
* `get_device_actions` — Queries what can be done with the device *right now* (e.g. start, stop, turn light on).
* `put_device_action` — Sends commands to the device (switch on, start program, control light).
* `get_device_camera` — Retrieves high-resolution camera images directly from the oven cavity (for compatible ovens).
* `start_device_program` — Starts a specific cooking or washing program directly on the device.
* `get_all_filling_levels` — Checks the filling levels of all compatible devices at once (e.g. salt, rinse aid, detergent).
* `get_device_filling_levels` — Shows the precise consumable levels for a specific device.
* `get_failure_details` — Provides detailed information about device error messages when a fault occurs.
* `get_operation_log` — Retrieves the recent write operations and their preflight results (audit log).

## 🔒 Security & Privacy

* **OAuth authorization:** The server accesses your appliances via the official *Miele 3rd Party API*. You log in securely via Miele once.
* **Automatic token refreshing:** The server invisibly takes care of keeping the connection alive in the background.
* **Local control:** The server runs on your own system (192.168.1.251) and only shares data with the AI you have authorized.

---

**Conclusion:** With this server, your AI becomes an intelligent butler — one that not only gives advice but perceives and interacts with the reality of your home!
