export default function PrivacyPage() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem', background: '#0a0a0a', color: '#e0e0e0', fontFamily: 'Arial, sans-serif', lineHeight: 1.8, minHeight: '100vh' }}>
      <h1 style={{ color: '#1da1f2', borderBottom: '1px solid #333', paddingBottom: '0.5rem' }}>Cardvela-CACA Privacy Policy</h1>
      <p><strong>Last Updated: </strong>March 8, 2026</p>

      <h2 style={{ color: '#ccc', marginTop: '2rem' }}>1. Overview</h2>
      <p style={{ color: '#aaa' }}>Cardvela (&quot;we&quot;) respects your privacy. This Privacy Policy explains how we collect, use, and protect your information when you use the Cardvela-CACA bot service.</p>

      <h2 style={{ color: '#ccc', marginTop: '2rem' }}>2. Information We Collect</h2>
      <p style={{ color: '#aaa' }}>When you authorize this Service to access your X account, we may collect the following information:</p>
      <ul style={{ color: '#aaa', paddingLeft: '1.5rem' }}>
        <li><strong>X Account Basic Info:</strong> Username, User ID, profile information (obtained through X API authorization).</li>
        <li><strong>OAuth Tokens:</strong> Access tokens used to perform authorized actions on your behalf.</li>
        <li><strong>Usage Data:</strong> Your interaction records and command history with the bot.</li>
      </ul>

      <h2 style={{ color: '#ccc', marginTop: '2rem' }}>3. How We Use Information</h2>
      <p style={{ color: '#aaa' }}>We use the collected information to:</p>
      <ul style={{ color: '#aaa', paddingLeft: '1.5rem' }}>
        <li>Provide and maintain bot service functionality.</li>
        <li>Process your requests and commands.</li>
        <li>Improve and optimize the service experience.</li>
        <li>Comply with legal obligations.</li>
      </ul>

      <h2 style={{ color: '#ccc', marginTop: '2rem' }}>4. Information Sharing</h2>
      <p style={{ color: '#aaa' }}>We do not sell, trade, or otherwise transfer your personal information to third parties, except:</p>
      <ul style={{ color: '#aaa', paddingLeft: '1.5rem' }}>
        <li>With your explicit consent.</li>
        <li>As required by law or lawful requests from law enforcement.</li>
        <li>As necessary to protect our rights, property, or safety.</li>
      </ul>

      <h2 style={{ color: '#ccc', marginTop: '2rem' }}>5. Data Security</h2>
      <p style={{ color: '#aaa' }}>We implement reasonable technical and organizational measures to protect your personal information, including encrypted storage of access tokens and restricted data access. However, no method of internet transmission is absolutely secure.</p>

      <h2 style={{ color: '#ccc', marginTop: '2rem' }}>6. Data Retention</h2>
      <p style={{ color: '#aaa' }}>We retain your data only for as long as necessary to provide the Service. You may revoke authorization at any time, and we will delete the associated tokens and data.</p>

      <h2 style={{ color: '#ccc', marginTop: '2rem' }}>7. Your Rights</h2>
      <p style={{ color: '#aaa' }}>You have the right to:</p>
      <ul style={{ color: '#aaa', paddingLeft: '1.5rem' }}>
        <li>Access the data we hold about you.</li>
        <li>Request correction or deletion of your data.</li>
        <li>Revoke X account authorization to this Service at any time.</li>
      </ul>

      <h2 style={{ color: '#ccc', marginTop: '2rem' }}>8. Policy Changes</h2>
      <p style={{ color: '#aaa' }}>We may update this Privacy Policy from time to time. Any changes will be posted on this page with an updated &quot;Last Updated&quot; date.</p>

      <h2 style={{ color: '#ccc', marginTop: '2rem' }}>9. Contact Us</h2>
      <p style={{ color: '#aaa' }}>For any questions regarding this Privacy Policy, please contact us at <a href="https://cardvela.com" style={{ color: '#1da1f2' }}>cardvela.com</a>.</p>
    </div>
  );
}
