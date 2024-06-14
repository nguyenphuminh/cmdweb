if not defined res.statusCode set res.statusCode=200
if not defined res.headers set res.headers={}

echo {"body":"%res.body%","statusCode":%res.statusCode%,"headers":%res.headers%}>temp/%~1.res
