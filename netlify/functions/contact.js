// Netlify serverless function to send contact/hire emails via Resend
const RECIPIENTS = ["hamanshu055@gmail.com", "kumarhamanshu40@gmail.com"];
const FROM_EMAIL = "Portfolio <onboarding@resend.dev>"; // works for sandbox; replace with your verified domain when ready

const buildBody = (data) => {
    const lines = Object.entries(data)
        .map(([key, value]) => `${key}: ${value || "-"}`)
        .join("\n");
    return lines;
};

exports.handler = async (event) => {
    if (event.httpMethod !== "POST") {
        return {
            statusCode: 405,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: "Method not allowed" })
        };
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        return {
            statusCode: 500,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: "Server email key missing" })
        };
    }

    let payload;
    try {
        payload = JSON.parse(event.body || "{}");
    } catch (error) {
        return {
            statusCode: 400,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: "Invalid JSON" })
        };
    }

    const {
        name,
        email,
        message,
        formType = "contact",
        phone,
        client_region,
        work_type,
        project_details,
        start_date,
        budget_range,
        budget
    } = payload;

    const subject =
        formType === "hire"
            ? `New Hire Request from ${name || "Unknown"}`
            : `New Contact Message from ${name || "Unknown"}`;

    const textBody =
        formType === "hire"
            ? buildBody({
                  Name: name,
                  Email: email,
                  Phone: phone,
                  Region: client_region,
                  WorkType: work_type,
                  StartDate: start_date,
                  BudgetRange: budget_range,
                  Budget: budget,
                  Details: project_details
              })
            : buildBody({
                  Name: name,
                  Email: email,
                  Message: message
              });

    try {
        const resendRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                from: FROM_EMAIL,
                to: RECIPIENTS,
                subject,
                text: textBody,
                reply_to: email || RECIPIENTS[0]
            })
        });

        if (!resendRes.ok) {
            const errorText = await resendRes.text();
            return {
                statusCode: resendRes.status,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: "Email send failed", detail: errorText })
            };
        }

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: "Sent" })
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: "Server error", detail: String(error) })
        };
    }
};
