import Link from 'next/link'

export function Content() {
  return (
    <>
      <p>If you run a business in Nigeria, you probably already know how important it is to send a customer something that clearly shows what they are paying for.</p>
      <p>But let&apos;s be honest.</p>
      <p>Not every business has a laptop sitting around in the shop.</p>
      <p>Sometimes you&apos;re in your store. Sometimes you&apos;re at a customer&apos;s location. Sometimes you&apos;re inside a workshop. Sometimes you&apos;re even on your way somewhere when a customer suddenly says:</p>
      <blockquote>&quot;Oga, abeg send me invoice.&quot;</blockquote>
      <p>And now you&apos;re looking for your old invoice template, opening Word or Canva, changing the customer&apos;s name, calculating everything again and trying to make sure you didn&apos;t make a mistake.</p>
      <p>There is an easier way.</p>

      <h2>What exactly is a professional invoice?</h2>
      <p>A professional invoice doesn&apos;t have to look complicated.</p>
      <p>At the very least, your customer should be able to look at it and immediately understand:</p>
      <ul>
        <li>Who is selling to them</li>
        <li>Who the invoice is for</li>
        <li>What they are paying for</li>
        <li>How many items or services they&apos;re paying for</li>
        <li>The price of each item</li>
        <li>The total amount</li>
        <li>How much they have already paid</li>
        <li>How much they still owe</li>
        <li>How they can make payment</li>
      </ul>
      <p>If your business is registered, you can also include details such as your CAC and TIN, alongside your business contact information.</p>
      <p>The goal is simple:</p>
      <blockquote>Your customer shouldn&apos;t have to call you just to understand your invoice.</blockquote>

      <h2>You don&apos;t need a laptop to create one</h2>
      <p>This is where things have changed.</p>
      <p>You can create a proper invoice directly from your phone.</p>
      <p>For a small business owner, this matters more than it sounds.</p>
      <p>Imagine you&apos;re a fashion designer and a customer orders:</p>
      <ul>
        <li>2 native outfits</li>
        <li>1 shirt</li>
        <li>1 pair of trousers</li>
      </ul>
      <p>Instead of creating three different documents, you can put everything on one invoice.</p>
      <p>Or you&apos;re running a repair business and a customer is paying for:</p>
      <ul>
        <li>Diagnosis</li>
        <li>Spare parts</li>
        <li>Labour</li>
        <li>Another repair job</li>
      </ul>
      <p>You can put the relevant items together and give the customer one clear document.</p>
      <p>That&apos;s what a good invoicing system should make possible.</p>

      <h2>What should your invoice contain?</h2>
      <p>Before you start creating invoices, make sure you&apos;re not leaving out important information.</p>

      <h3>1. Your business information</h3>
      <p>Your invoice should clearly show your business name.</p>
      <p>If available, you can also include:</p>
      <ul>
        <li>Logo</li>
        <li>Phone number</li>
        <li>Email</li>
        <li>Business location</li>
        <li>CAC number</li>
        <li>TIN</li>
      </ul>
      <p>You don&apos;t need to fill the invoice with unnecessary information.</p>

      <h3>2. Your customer&apos;s information</h3>
      <p>At minimum, your customer should be properly identified.</p>
      <p>Depending on the information you have, this can include:</p>
      <ul>
        <li>Name</li>
        <li>Phone number</li>
        <li>Email</li>
        <li>Address</li>
      </ul>
      <p>This becomes particularly useful when you&apos;re dealing with repeat customers.</p>

      <h3>3. What the customer is paying for</h3>
      <p>This is one of the most important parts.</p>
      <p>Don&apos;t simply write:</p>
      <blockquote>&quot;Goods — ₦100,000&quot;</blockquote>
      <p>if you can be more specific.</p>
      <p>Instead, show what the customer actually bought or what service you provided.</p>
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>Qty</th>
            <th>Unit Price</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Senator outfit</td>
            <td>2</td>
            <td>₦45,000</td>
            <td>₦90,000</td>
          </tr>
          <tr>
            <td>Native shirt</td>
            <td>1</td>
            <td>₦20,000</td>
            <td>₦20,000</td>
          </tr>
        </tbody>
      </table>
      <p>Now there is no confusion.</p>
      <p>The customer can see exactly where the total came from.</p>

      <h3>4. Amount paid and balance</h3>
      <p>This is another part many small businesses overlook.</p>
      <p>If the total is ₦110,000 and the customer has paid ₦50,000, the invoice should make it obvious:</p>
      <ul>
        <li>Total: ₦110,000</li>
        <li>Amount Paid: ₦50,000</li>
        <li>Balance Due: ₦60,000</li>
      </ul>
      <p>Nobody should have to start calculating it with their calculator.</p>

      <h2>How Cresoa makes this easier</h2>
      <p>This is one of the things we built into <Link href="/">Cresoa</Link>.</p>
      <p>Instead of creating an invoice from scratch every time, Cresoa can pull the business and customer information you already have in the system.</p>
      <p>Your business details can appear automatically.</p>
      <p>Your customer&apos;s information can appear automatically.</p>
      <p>You can add multiple items to the same invoice, set quantities and prices, and let the system calculate the totals.</p>
      <p>And if you add something directly while creating the invoice, you don&apos;t have to turn it into another unnecessary order just to put it on the invoice.</p>
      <p>That keeps your actual Orders list clean.</p>

      <h2>You can also record the payment</h2>
      <p>Let&apos;s say your customer has paid part of the invoice.</p>
      <p>You don&apos;t have to leave the invoice showing the original amount as though nothing has been paid.</p>
      <p>With Cresoa, you can record the payment from the invoice and keep the payment information connected to the relevant records.</p>
      <p>That makes it easier to know what has been paid and what is still outstanding.</p>

      <h2>Then send it straight to WhatsApp</h2>
      <p>Let&apos;s be realistic.</p>
      <p>For many Nigerian businesses, WhatsApp is part of the business.</p>
      <p>Customers send orders there.</p>
      <p>They ask for prices there.</p>
      <p>They send payment confirmations there.</p>
      <p>So your invoice should fit into that workflow.</p>
      <p>With Cresoa, you can generate the invoice, download it as a PDF and share it with the customer through WhatsApp.</p>
      <p>No need to tell the customer:</p>
      <blockquote>&quot;I&apos;ll send it when I get home and open my laptop.&quot;</blockquote>
      <p>You can do it from your phone.</p>

      <h2>What makes an invoice look professional?</h2>
      <p>It&apos;s not necessarily about making it colourful.</p>
      <p>A good invoice should be:</p>
      <ul>
        <li>Clear. The customer should understand it immediately.</li>
        <li>Accurate. The numbers should add up correctly.</li>
        <li>Complete. Important business and customer information shouldn&apos;t be missing.</li>
        <li>Easy to share. If your customers communicate with you through WhatsApp, your invoice should be easy to send there.</li>
        <li>And most importantly, it should make your business look organised.</li>
      </ul>
      <p>Because the way you present your invoice is also part of how customers experience your business.</p>

      <h2>You don&apos;t need to be a big company</h2>
      <p>Professional invoices aren&apos;t only for large companies.</p>
      <ul>
        <li>A tailor can use one.</li>
        <li>A phone repair technician can use one.</li>
        <li>A fashion designer can use one.</li>
        <li>A small trader can use one.</li>
        <li>A growing business can use one.</li>
      </ul>
      <p>You don&apos;t need hundreds of customers before you start keeping proper records.</p>
      <p>In fact, starting early makes things much easier when the business grows.</p>

      <h2>Create your next invoice from your phone</h2>
      <p>If you&apos;ve been creating invoices manually, switching between different apps or simply sending customers your bank details and a handwritten calculation, you don&apos;t necessarily need a complicated setup.</p>
      <p>Cresoa gives Nigerian businesses a simpler way to manage their day-to-day operations, including professional invoicing.</p>
      <p>You can manage your business records, customers, orders, inventory and other operations from one place — and create invoices that are clear enough for your customers to understand at a glance.</p>
      <p>Whether you&apos;re sending an invoice for one item or combining several products or services into one document, the goal is the same:</p>
      <blockquote>Make business easier to manage.</blockquote>
      <p>Ready to try it? Join the waitlist below and get 30 days of Pro features free at launch.</p>
    </>
  )
}
