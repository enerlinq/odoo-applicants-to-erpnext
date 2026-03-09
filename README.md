# odoo-applicants-to-erpnext

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run sync
```

## Environment Variables

Create a `.env` file in the root of the project with the following variables:

```env
# Odoo Settings
ODOO_URL=https://your-odoo-instance.com
ODOO_DB=your_database_name
ODOO_USERNAME=your_username
ODOO_PASSWORD=your_password

# ERPNext Settings
ERPNEXT_URL=https://your-erpnext-instance.com
ERPNEXT_API_KEY=your_api_key
ERPNEXT_API_SECRET=your_api_secret
```

This project was created using `bun init` in bun v1.3.10. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.

## Compatibility
Compatible and tested with:
- Odoo v18
- Frappe ERPNext v15
- Frappe HR v15

## License
MIT License

