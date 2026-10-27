# FUDMA Food & Mini Mart Ordering System
**FUDMA-GET 411: Artificial Intelligence Applications in Engineering – Group 8 Mini Project**
Federal University Dutsin-Ma, Katsina State

## Features
- Customer page: tap a category (Meals, Meat, Snacks, Soft Drinks, Bread, Mini Mart) to open it, pick items, enter name + matric ID, place order.
- Staff dashboard (`/staff.html`): log in with a group matric number, then Accept → Ready → Delivered (or Reject).
- Customer sees status updates instantly (live, no refresh needed).
- Saves users, orders and transactions in `data/db.json`.

## Project structure
```
server.js        backend (Express API + live updates + storage)
menu.json        categories and prices (edit here to change the menu)
public/          index.html (customer), staff.html (staff), style.css
```

## Run locally (VS Code terminal)
```bash
npm install
npm start
```
The terminal prints two addresses:
- `http://localhost:3000` – on your computer
- `http://192.168.x.x:3000` – other phones/laptops on the same Wi-Fi can open this

Staff page: add `/staff.html` to the address.

## Staff login codes
ENG/2024/32910, ENG/2025/39685, ENG/2024/32421, ENG/2024/32113, ENG/2024/31583,
ENG/2024/31983, ENG/2024/31925, ENG/2024/35041, ENG/2024/32014, ENG/2024/31750, ENG/2024/32102

## Put on GitHub (VS Code)
1. Open the folder in VS Code → Source Control (branch icon) → **Initialize Repository**.
2. Type a message, **Commit**, then **Publish Branch** to GitHub.

## Deploy on Render (public website)
1. Go to render.com → **New +** → **Web Service** → connect your GitHub repo.
2. Settings: Runtime **Node**, Build Command `npm install`, Start Command `npm start`.
3. Click **Create Web Service**. Render gives you a public link like `https://your-app.onrender.com`.

### Keeping data permanently on Render
Render's free plan wipes files when the app redeploys or restarts, so saved orders can be lost.
To keep data: add a **Disk** (paid plan) mounted at `/var/data`, then add the environment variable
`DATA_DIR=/var/data`. For a class demo, the free plan works fine.

## Delivery fees and payment
- Pick up at the shop: free. Delivery within department: ₦250. Delivery outside school: ₦500.
- Payment: Cash (collected on pickup/delivery) or Online (bank transfer; staff press "Confirm transfer received").
- Set your real account on Render → Environment: `PAY_BANK`, `PAY_ACCOUNT_NAME`, `PAY_ACCOUNT_NUMBER`.
