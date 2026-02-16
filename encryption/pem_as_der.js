/** Get a DER encoded public key as a PEM encoded public key

  {
    pem: <Pem Encoded Public Key String>
  }

  @returns
  {
    der: <DER Binary Buffer>
  }
*/
export default ({pem}) => {
  const lines = pem.split('\n');

  lines.pop();

  lines.shift();

  const der = Buffer.from(lines.join(String()), 'base64');

  return {der};
};
