
from pydantic import AnyHttpUrl, TypeAdapter

url_str = "http://localhost:3000"
adapter = TypeAdapter(AnyHttpUrl)
url = adapter.validate_python(url_str)

print(f"Original: {url_str}")
print(f"Parsed: {url}")
print(f"Stringified: {str(url)}")

# checking list behavior
list_str = '["http://localhost:3000"]'
list_adapter = TypeAdapter(list[AnyHttpUrl])
parsed_list = list_adapter.validate_json(list_str)
print(f"List parsed: {parsed_list}")
print(f"First item stringified: {str(parsed_list[0])}")
