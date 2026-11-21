// Lê o último código enviado para EMAIL na fila `mail` do Firestore Emulator (somente E2E local).
const base =
  'http://10.0.2.2:8080/v1/projects/demo-vai-chover/databases/(default)/documents/mail?pageSize=50';
const response = http.get(base);
const documents = json(response.body).documents || [];
const mine = documents
  .filter((doc) => doc.fields.to.stringValue === EMAIL)
  .sort((a, b) => (a.createTime < b.createTime ? 1 : -1))[0];
const text = mine.fields.message.mapValue.fields.text.stringValue;
output.code = text.match(/\d{6}/)[0];
