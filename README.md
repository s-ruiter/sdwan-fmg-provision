# FortiManager Provisioning Tool

A modern web application for provisioning FortiManager devices using Postman collections. This tool provides a glassmorphism-styled dashboard to input variables (like ADOM, DNS, IP addresses) and execute API calls dynamicially against a FortiManager instance.

## Features

- **Glassmorphism UI**: Premium dark-mode interface with dynamic background animations.
- **FMG Proxy**: Securely proxies requests through a Python backend to handle CORS and SSL.
- **Dynamic Variable Substitution**: Automatically replaces placeholders (e.g., `$(dns_primary)`) in your Postman collection with user inputs.
- **Collection Editor**: Built-in editor to modify `postman_collection.json` directly from the browser.
- **Partial Provisioning**: Run all steps or select specific API calls to execute.
- **Result Feedback**: Visual success/error reporting for each API call.

## Deployment with Docker (Recommended)

The easiest way to run the application is using Docker Compose.

1. **Clone the repository**:
   ```bash
   git clone https://github.com/s-ruiter/sdwan-fmg-provision.git
   cd sdwan-fmg-provision
   ```

2. **Start the container**:
   ```bash
   docker-compose up -d --build
   ```

3. **Access the application**:
   Open your browser and navigate to `http://localhost:8000`.

4. **Persisting Data**:
   The `postman_collection.json` file is mounted as a volume, so edits made via the web interface will persist on your host machine.

## Manual Installation

If you prefer to run without Docker:

1. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Run the Server**:
   ```bash
   python3 main.py
   ```

3. **Access**:
   http://localhost:8000

## Usage

1. **Login**: Enter your FortiManager IP, Username, and Password.
2. **Configure**: On the dashboard, fill in the Global Configuration variables.
3. **Select Scope**: Choose "Run All Steps" or select a specific step.
4. **Provision**: Click "Run Provisioning". The results will appear at the bottom.

## Structure

-   `main.py`: The FastAPI backend handling proxy requests to FMG.
-   `static/`: Contains the frontend assets (HTML, CSS, JS).
