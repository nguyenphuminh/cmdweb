:: End of the handler, respond to the user

if not defined res.statusCode set res.statusCode=200
if not defined res.headers set res.headers={}

echo {"statusCode":%res.statusCode%,"headers":%res.headers%}>temp/%~1.resh
echo %res.body%>temp/%~1.resb
