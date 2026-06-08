import app.schemas
import inspect

def inspect_schemas():
    print(f"AgentRegistration in app.schemas: {getattr(app.schemas, 'AgentRegistration', 'MISSING')}")
    if hasattr(app.schemas, 'AgentRegistration'):
        cls = app.schemas.AgentRegistration
        print(f"Class: {cls}")
        print(f"File: {inspect.getfile(cls)}")
        print(f"Fields: {cls.model_fields.keys()}")
        
        # Check if country field is a model
        country_field = cls.model_fields.get('country')
        if country_field:
            print(f"Country field type: {country_field.annotation}")
            
    with open("schema_inspection.txt", "w") as f:
        f.write(f"AgentRegistration: {getattr(app.schemas, 'AgentRegistration', 'MISSING')}\n")
        if hasattr(app.schemas, 'AgentRegistration'):
            cls = app.schemas.AgentRegistration
            f.write(f"File: {inspect.getfile(cls)}\n")
            f.write(f"Fields: {list(cls.model_fields.keys())}\n")
            country_field = cls.model_fields.get('country')
            if country_field:
                f.write(f"Country field type: {country_field.annotation}\n")

if __name__ == "__main__":
    inspect_schemas()
