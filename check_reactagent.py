try:
    from langgraph.prebuilt import ReactAgent
    print("FOUND: langgraph.prebuilt.ReactAgent")
except ImportError:
    print("NOT FOUND: langgraph.prebuilt.ReactAgent")

try:
    from langgraph.prebuilt import create_react_agent
    print("FOUND: langgraph.prebuilt.create_react_agent")
except:
    pass
