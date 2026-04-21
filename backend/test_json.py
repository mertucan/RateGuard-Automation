import json
b = b'{"message": "al\xc4\xb1n beni!!"}'
try:
    print(json.loads(b))
except Exception as e:
    print(repr(e))
