import Link from 'next/link'

export default function BlogPostPage() {
  return (
    <article style={articleStyle}>
      {/* Header */}
      <header style={headerStyle}>
        <p style={categoryStyle}>Business Tips</p>
        <h1 style={titleStyle}>How to Create Professional Invoices in 2 Minutes from Your Phone: A Nigerian SME Guide</h1>
        <p style={metaStyle}>Published on August 26, 2026</p>
      </header>

      {/* Content */}
      <div style={contentStyle}>
        <p>
          If you run a business in Nigeria, you probably already know how important it is to send a customer something that clearly shows what they are paying for.
        </p>
        <p>But let's be honest.</p>
        <p>Not every business has a laptop sitting around in the shop.</p>
        <p>
          Sometimes you're in your store. Sometimes you're at a customer's location. Sometimes you're inside a workshop. Sometimes you're even on your way somewhere when a customer suddenly says:
        </p>
        <p style={quoteStyle}>“Oga, abeg send me invoice.”</p>
        <p>
          And now you're looking for your old invoice template, opening Word or Canva, changing the customer's name, calculating everything again and trying to make sure you didn't make a mistake.
        </p>
        <p>There is an easier way.</p>

        <h2 style={h2Style}>What exactly is a professional invoice?</h2>
        <p>A professional invoice doesn't have to look complicated.</p>
        <p>At the very least, your customer should be able to look at it and immediately understand:</p>
        <ul style={listStyle}>
          <li>Who is selling to them</li>
          <li>Who the invoice is for</li>
          <li>What they are paying for</li>
          <li>How many items or services they're paying for</li>
          <li>The price of each item</li>
          <li>The total amount</li>
          <li>How much they have already paid</li>
          <li>How much they still owe</li>
          <li>How they can make payment</li>
        </ul>
        <p>
          If your business is registered, you can also include details such as your CAC and TIN, alongside your business contact information.
        </p>
        <p>The goal is simple:</p>
        <p style={quoteStyle}>Your customer shouldn't have to call you just to understand your invoice.</p>

        <h2 style={h2Style}>You don't need a laptop to create one</h2>
        <p>This is where things have changed.</p>
        <p>You can create a proper invoice directly from your phone.</p>
        <p>For a small business owner, this matters more than it sounds.</p>
        <p>Imagine you're a fashion designer and a customer orders:</p>
        <ul style={listStyle}>
          <li>2 native outfits</li>
          <li>1 shirt</li>
          <li>1 pair of trousers</li>
        </ul>
        <p>Instead of creating three different documents, you can put everything on one invoice.</p>
        <p>Or you're running a repair business and a customer is paying for:</p>
        <ul style={listStyle}>
          <li>Diagnosis</li>
          <li>Spare parts</li>
          <li>Labour</li>
          <li>Another repair job</li>
        </ul>
        <p>You can put the relevant items together and give the customer one clear document.</p>
        <p>That's what a good invoicing system should make possible.</p>

        <h2 style={h2Style}>What should your invoice contain?</h2>
        <p>Before you start creating invoices, make sure you're not leaving out important information.</p>

        <h3 style={h3Style}>1. Your business information</h3>
        <p>Your invoice should clearly show your business name.</p>
        <p>If available, you can also include:</p>
        <ul style={listStyle}>
          <li>Logo</li>
          <li>Phone number</li>
          <li>Email</li>
          <li>Business location</li>
          <li>CAC number</li>
          <li>TIN</li>
        </ul>
        <p>You don't need to fill the invoice with unnecessary information.</p>

        <h3 style={h3Style}>2. Your customer's information</h3>
        <p>At minimum, your customer should be properly identified.</p>
        <p>Depending on the information you have, this can include:</p>
        <ul style={listStyle}>
          <li>Name</li>
          <li>Phone number</li>
          <li>Email</li>
          <li>Address</li>
        </ul>
        <p>This becomes particularly useful when you're dealing with repeat customers.</p>

        <h3 style={h3Style}>3. What the customer is paying for</h3>
        <p>This is one of the most important parts.</p>
        <p>Don't simply write:</p>
        <p style={quoteStyle}>“Goods — ₦100,000”</p>
        <p>if you can be more specific.</p>
        <p>Instead, show what the customer actually bought or what service you provided.</p>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Item</th>
              <th style={thStyle}>Qty</th>
              <th style={thStyle}>Unit Price</th>
              <th style={thStyle}>Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={tdStyle}>Senator outfit</td>
              <td style={tdStyle}>2</td>
              <td style={tdStyle}>₦45,000</td>
              <td style={tdStyle}>₦90,000</td>
            </tr>
            <tr>
              <td style={tdStyle}>Native shirt</td>
              <td style={tdStyle}>1</td>
              <td style={tdStyle}>₦20,000</td>
              <td style={tdStyle}>₦20,000</td>
            </tr>
          </tbody>
        </table>
        <p>Now there is no confusion.</p>
        <p>The customer can see exactly where the total came from.</p>

        <h3 style={h3Style}>4. Amount paid and balance</h3>
        <p>This is another part many small businesses overlook.</p>
        <p>If the total is ₦110,000 and the customer has paid ₦50,000, the invoice should make it obvious:</p>
        <ul style={listStyle}>
          <li>Total: ₦110,000</li>
          <li>Amount Paid: ₦50,000</li>
          <li>Balance Due: ₦60,000</li>
        </ul>
        <p>Nobody should have to start calculating it with their calculator.</p>

        <h2 style={h2Style}>How CRESOA makes this easier</h2>
        <p>This is one of the things we built into CRESOA.</p>
        <p>Instead of creating an invoice from scratch every time, CRESOA can pull the business and customer information you already have in the system.</p>
        <p>Your business details can appear automatically.</p>
        <p>Your customer's information can appear automatically.</p>
        <p>You can add multiple items to the same invoice, set quantities and prices, and let the system calculate the totals.</p>
        <p>And if you add something directly while creating the invoice, you don't have to turn it into another unnecessary order just to put it on the invoice.</p>
        <p>That keeps your actual Orders list clean.</p>

        <h2 style={h2Style}>You can also record the payment</h2>
        <p>Let's say your customer has paid part of the invoice.</p>
        <p>You don't have to leave the invoice showing the original amount as though nothing has been paid.</p>
        <p>With CRESOA, you can record the payment from the invoice and keep the payment information connected to the relevant records.</p>
        <p>That makes it easier to know what has been paid and what is still outstanding.</p>

        <h2 style={h2Style}>Then send it straight to WhatsApp</h2>
        <p>Let's be realistic.</p>
        <p>For many Nigerian businesses, WhatsApp is part of the business.</p>
        <p>Customers send orders there.</p>
        <p>They ask for prices there.</p>
        <p>They send payment confirmations there.</p>
        <p>So your invoice should fit into that workflow.</p>
        <p>With CRESOA, you can generate the invoice, download it as a PDF and share it with the customer through WhatsApp.</p>
        <p>No need to tell the customer:</p>
        <p style={quoteStyle}>“I'll send it when I get home and open my laptop.”</p>
        <p>You can do it from your phone.</p>

        <h2 style={h2Style}>What makes an invoice look professional?</h2>
        <p>It's not necessarily about making it colourful.</p>
        <p>A good invoice should be:</p>
        <ul style={listStyle}>
          <li>Clear. The customer should understand it immediately.</li>
          <li>Accurate. The numbers should add up correctly.</li>
          <li>Complete. Important business and customer information shouldn't be missing.</li>
          <li>Easy to share. If your customers communicate with you through WhatsApp, your invoice should be easy to send there.</li>
          <li>And most importantly, it should make your business look organised.</li>
        </ul>
        <p>Because the way you present your invoice is also part of how customers experience your business.</p>

        <h2 style={h2Style}>You don't need to be a big company</h2>
        <p>Professional invoices aren't only for large companies.</p>
        <ul style={listStyle}>
          <li>A tailor can use one.</li>
          <li>A phone repair technician can use one.</li>
          <li>A fashion designer can use one.</li>
          <li>A small trader can use one.</li>
          <li>A growing business can use one.</li>
        </ul>
        <p>You don't need hundreds of customers before you start keeping proper records.</p>
        <p>In fact, starting early makes things much easier when the business grows.</p>

        <h2 style={h2Style}>Create your next invoice from your phone</h2>
        <p>If you've been creating invoices manually, switching between different apps or simply sending customers your bank details and a handwritten calculation, you don't necessarily need a complicated setup.</p>
        <p>
          <Link href="https://cresoa.com.ng" style={linkStyle}>CRESOA</Link> gives Nigerian businesses a simpler way to manage their day-to-day operations, including professional invoicing.
        </p>
        <p>You can manage your business records, customers, orders, inventory and other operations from one place — and create invoices that are clear enough for your customers to understand at a glance.</p>
        <p>Whether you're sending an invoice for one item or combining several products or services into one document, the goal is the same:</p>
        <p style={quoteStyle}>Make business easier to manage.</p>
        <p>Ready to try it?</p>
        <p>
          <Link href="https://cresoa.com.ng" style={ctaStyle}>Start your free Cresoa account today</Link> and see how easy it is to run your business from your phone.
        </p>
      </div>
    </article>
  )
}

// ─── Styles ───
const articleStyle = {
  maxWidth: '760px',
  margin: '0 auto',
  padding: '2rem 1rem',
  background: 'var(--cresoa-bg)',
  color: 'var(--cresoa-text)',
  fontFamily: 'Inter, sans-serif',
  lineHeight: '1.75',
}

const headerStyle = {
  marginBottom: '2rem',
  borderBottom: '1px solid var(--cresoa-border)',
  paddingBottom: '1rem',
}

const categoryStyle = {
  color: 'var(--cresoa-accent)',
  fontWeight: 700,
  fontSize: '0.85rem',
  textTransform: 'uppercase',
  letterSpacing: '1px',
  marginBottom: '0.5rem',
}

const titleStyle = {
  fontSize: '2rem',
  fontWeight: 800,
  color: 'var(--cresoa-primary)',
  lineHeight: 1.2,
  margin: '0 0 0.5rem',
}

const metaStyle = {
  color: 'var(--cresoa-text-muted)',
  fontSize: '0.85rem',
}

const contentStyle = {
  fontSize: '1.05rem',
}

const h2Style = {
  fontSize: '1.5rem',
  fontWeight: 700,
  marginTop: '2.5rem',
  marginBottom: '1rem',
  color: 'var(--cresoa-primary)',
}

const h3Style = {
  fontSize: '1.2rem',
  fontWeight: 600,
  marginTop: '1.5rem',
  marginBottom: '0.5rem',
  color: 'var(--cresoa-primary)',
}

const listStyle = {
  paddingLeft: '1.5rem',
  marginBottom: '1rem',
}

const quoteStyle = {
  fontStyle: 'italic',
  borderLeft: '4px solid var(--cresoa-accent)',
  paddingLeft: '1rem',
  margin: '1rem 0',
  color: 'var(--cresoa-text-muted)',
}

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  margin: '1rem 0',
  fontSize: '0.95rem',
}

const thStyle = {
  borderBottom: '2px solid var(--cresoa-border)',
  padding: '0.5rem',
  textAlign: 'left',
  fontWeight: 700,
}

const tdStyle = {
  borderBottom: '1px solid var(--cresoa-border)',
  padding: '0.5rem',
  textAlign: 'left',
}

const linkStyle = {
  color: 'var(--cresoa-accent)',
  fontWeight: 600,
  textDecoration: 'underline',
}

const ctaStyle = {
  display: 'inline-block',
  background: 'var(--cresoa-accent)',
  color: '#fff',
  padding: '0.75rem 1.5rem',
  borderRadius: '8px',
  fontWeight: 700,
  textDecoration: 'none',
  marginTop: '0.5rem',
    }
