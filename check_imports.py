import sys

def check_import(module_name, attribute_name):
    try:
        module = __import__(module_name, fromlist=[attribute_name])
        if hasattr(module, attribute_name):
            print(f"FOUND: {module_name}.{attribute_name}")
            return True
        else:
            print(f"NOT FOUND: {module_name}.{attribute_name} (Module exists but attribute missing)")
            return False
    except ImportError:
        print(f"NOT FOUND: {module_name} (Module import failed)")
        return False
    except Exception as e:
        print(f"ERROR checking {module_name}.{attribute_name}: {e}")
        return False

print("--- Checking LangGraph ---")
check_import("langgraph.prebuilt", "create_agent")
check_import("langgraph.prebuilt", "create_react_agent")
check_import("langgraph.graph", "StateGraph")

print("\n--- Checking LangChain ---")
check_import("langchain.agents", "create_agent")
check_import("langchain.agents", "create_react_agent")

print("\n--- Dir Source ---")
try:
    import langgraph.prebuilt
    print(f"langgraph.prebuilt members: {dir(langgraph.prebuilt)}")
except:
    pass
