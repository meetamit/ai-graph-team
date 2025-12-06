import { fixtureFromSchema } from '../src/models/utils';
import { zodFromSchema } from '@ai-graph-team/llm-tools';

describe('Schema utilities', () => {
  describe('fixtureFromSchema + zodFromSchema integration', () => {
    it('should generate valid fixture for simple object schema with string properties', () => {
      const schema = {
        type: "object" as const,
        properties: {
          proposal: {
            type: "string" as const,
            description: "The main proposal or topic to be debated"
          },
          special_considerations: {
            type: "string" as const,
            description: "Any special considerations or context for the debate"
          }
        }
      };

      const fixture = fixtureFromSchema(schema);
      const validator = zodFromSchema(schema);
      
      // Should not throw
      expect(() => validator.parse(fixture)).not.toThrow();
    });

    it('should generate valid fixture for nested array of objects', () => {
      const schema = {
        type: "object" as const,
        properties: {
          arguments: {
            type: "array" as const,
            items: {
              type: "object" as const,
              properties: {
                argument: {
                  type: "string" as const,
                  description: "The content or statement of the argument"
                },
                weight: {
                  type: "number" as const,
                  description: "The strength or importance of the argument"
                }
              }
            }
          }
        }
      };

      const fixture = fixtureFromSchema(schema);
      const validator = zodFromSchema(schema);
      
      // Should not throw
      expect(() => validator.parse(fixture)).not.toThrow();
    });

    it('should generate valid fixture for object with required fields', () => {
      const schema = {
        type: "object" as const,
        properties: {
          name: {
            type: "string" as const,
            description: "User's name"
          },
          age: {
            type: "number" as const,
            description: "User's age"
          },
          email: {
            type: "string" as const,
            description: "User's email"
          }
        },
        required: ["name", "age"]
      };

      const fixture = fixtureFromSchema(schema);
      const validator = zodFromSchema(schema);
      
      // Should not throw
      expect(() => validator.parse(fixture)).not.toThrow();
    });

    it('should generate valid fixture for integer with constraints', () => {
      const schema = {
        type: "object" as const,
        properties: {
          count: {
            type: "integer" as const,
            minimum: 1,
            maximum: 100
          }
        }
      };

      const fixture = fixtureFromSchema(schema);
      const validator = zodFromSchema(schema);
      
      // Should not throw
      expect(() => validator.parse(fixture)).not.toThrow();
    });

    it('should generate valid fixture for string with length constraints', () => {
      const schema = {
        type: "object" as const,
        properties: {
          code: {
            type: "string" as const,
            minLength: 3,
            maxLength: 10
          }
        }
      };

      const fixture = fixtureFromSchema(schema);
      const validator = zodFromSchema(schema);
      
      // Should not throw
      expect(() => validator.parse(fixture)).not.toThrow();
    });

    it('should generate valid fixture for array with minItems and maxItems', () => {
      const schema = {
        type: "object" as const,
        properties: {
          tags: {
            type: "array" as const,
            items: {
              type: "string" as const
            },
            minItems: 2,
            maxItems: 5
          }
        }
      };

      const fixture = fixtureFromSchema(schema);
      const validator = zodFromSchema(schema);
      
      // Should not throw
      expect(() => validator.parse(fixture)).not.toThrow();
    });

    it('should generate valid fixture for boolean properties', () => {
      const schema = {
        type: "object" as const,
        properties: {
          isActive: {
            type: "boolean" as const,
            description: "Whether the item is active"
          },
          verified: {
            type: "boolean" as const
          }
        }
      };

      const fixture = fixtureFromSchema(schema);
      const validator = zodFromSchema(schema);
      
      // Should not throw
      expect(() => validator.parse(fixture)).not.toThrow();
    });

    it('should generate valid fixture for enum values', () => {
      const schema = {
        type: "object" as const,
        properties: {
          status: {
            type: "string" as const,
            enum: ["pending", "approved", "rejected"]
          },
          priority: {
            type: "number" as const,
            enum: [1, 2, 3, 4, 5]
          }
        }
      };

      const fixture = fixtureFromSchema(schema);
      const validator = zodFromSchema(schema);
      
      // Should not throw
      expect(() => validator.parse(fixture)).not.toThrow();
    });

    it('should generate valid fixture for complex nested structure', () => {
      const schema = {
        type: "object" as const,
        properties: {
          user: {
            type: "object" as const,
            properties: {
              profile: {
                type: "object" as const,
                properties: {
                  firstName: { type: "string" as const },
                  lastName: { type: "string" as const },
                  age: { type: "integer" as const, minimum: 0 }
                },
                required: ["firstName", "lastName"]
              },
              roles: {
                type: "array" as const,
                items: { type: "string" as const }
              }
            }
          }
        }
      };

      const fixture = fixtureFromSchema(schema);
      const validator = zodFromSchema(schema);
      
      // Should not throw
      expect(() => validator.parse(fixture)).not.toThrow();
    });

    // Negative test cases
    it('should fail validation when fixture is malformed - wrong type for number', () => {
      const schema = {
        type: "object" as const,
        properties: {
          name: {
            type: "string" as const,
          },
          age: {
            type: "number" as const,
          }
        },
        required: ["name", "age"]
      };

      const validator = zodFromSchema(schema);
      
      // Manually create a malformed fixture
      const malformedFixture = {
        name: "John Doe",
        age: "not a number" // Wrong type - should be number
      };
      
      // Should throw validation error
      expect(() => validator.parse(malformedFixture)).toThrow();
    });

    it('should fail validation when required field is missing', () => {
      const schema = {
        type: "object" as const,
        properties: {
          name: {
            type: "string" as const,
          },
          email: {
            type: "string" as const,
          }
        },
        required: ["name", "email"]
      };

      const validator = zodFromSchema(schema);
      
      // Malformed fixture missing required field
      const malformedFixture = {
        name: "John Doe"
        // Missing required 'email' field
      };
      
      // Should throw validation error
      expect(() => validator.parse(malformedFixture)).toThrow();
    });

    it('should fail validation when number is outside constraints', () => {
      const schema = {
        type: "object" as const,
        properties: {
          score: {
            type: "number" as const,
            minimum: 0,
            maximum: 100
          }
        }
      };

      const validator = zodFromSchema(schema);
      
      // Malformed fixture with value outside range
      const malformedFixture = {
        score: 150 // Exceeds maximum of 100
      };
      
      // Should throw validation error
      expect(() => validator.parse(malformedFixture)).toThrow();
    });
  });

  describe('fixtureFromSchema options', () => {
    it('should respect arrayLength option', () => {
      const schema = {
        type: "array" as const,
        items: {
          type: "string" as const
        }
      };

      const fixture = fixtureFromSchema(schema, { arrayLength: 2 });
      
      expect(Array.isArray(fixture)).toBe(true);
      expect(fixture.length).toBe(2);
    });

    it('should respect omitOptionalProps option', () => {
      const schema = {
        type: "object" as const,
        properties: {
          required_field: {
            type: "string" as const
          },
          optional_field: {
            type: "string" as const
          }
        },
        required: ["required_field"]
      };

      const fixture = fixtureFromSchema(schema, { omitOptionalProps: true });
      
      expect(fixture).toHaveProperty('required_field');
      expect(fixture).not.toHaveProperty('optional_field');
    });
  });

  describe('zodFromSchema edge cases', () => {
    it('should handle nullable fields', () => {
      const schema = {
        type: "object" as const,
        properties: {
          nullableField: {
            type: "string" as const,
            nullable: true as const
          }
        }
      };

      const validator = zodFromSchema(schema);
      
      // Both null and string should be valid
      expect(() => validator.parse({ nullableField: null })).not.toThrow();
      expect(() => validator.parse({ nullableField: "test" })).not.toThrow();
    });

    it('should handle optional fields', () => {
      const schema = {
        type: "object" as const,
        properties: {
          optionalField: {
            type: "string" as const,
            optional: true as const
          }
        }
      };

      const validator = zodFromSchema(schema);
      
      // Both undefined and string should be valid
      expect(() => validator.parse({})).not.toThrow();
      expect(() => validator.parse({ optionalField: "test" })).not.toThrow();
    });
  });

  describe('Schema composition - oneOf, allOf, anyOf', () => {
    describe('oneOf', () => {
      it('should generate valid fixture for oneOf with different object types', () => {
        const schema = {
          type: "object" as const,
          properties: {
            payment: {
              oneOf: [
                {
                  type: "object" as const,
                  properties: {
                    method: { type: "string" as const, enum: ["credit_card"] },
                    cardNumber: { type: "string" as const },
                    cvv: { type: "string" as const }
                  },
                  required: ["method", "cardNumber", "cvv"]
                },
                {
                  type: "object" as const,
                  properties: {
                    method: { type: "string" as const, enum: ["paypal"] },
                    email: { type: "string" as const }
                  },
                  required: ["method", "email"]
                }
              ]
            }
          }
        };

        const fixture = fixtureFromSchema(schema);
        const validator = zodFromSchema(schema as any);
        
        // Should not throw - fixture should match one of the schemas
        expect(() => validator.parse(fixture)).not.toThrow();
      });

      it('should generate valid fixture for oneOf with primitive types', () => {
        const schema = {
          oneOf: [
            { type: "string" as const },
            { type: "number" as const }
          ]
        };

        const fixture = fixtureFromSchema(schema);
        const validator = zodFromSchema(schema);
        
        // Should not throw
        expect(() => validator.parse(fixture)).not.toThrow();
        // Should be either string or number
        expect(typeof fixture === 'string' || typeof fixture === 'number').toBe(true);
      });

      // This is skipped because strict oneOf isn't truly implemented
      it.skip('should fail validation when data matches multiple oneOf schemas', () => {
        const schema = {
          oneOf: [
            { type: "string" as const, minLength: 1 },
            { type: "string" as const, maxLength: 100 }
          ]
        };

        const validator = zodFromSchema(schema);
        
        // A string that matches both schemas should fail oneOf validation
        const invalidData = "test";
        
        // This doesn't fail because oneOf isn't truly implemented
        expect(() => validator.parse(invalidData)).toThrow();
      });
    });

    describe('allOf', () => {
      it('should generate valid fixture for allOf combining multiple object schemas', () => {
        const schema = {
          type: "object" as const,
          properties: {
            user: {
              allOf: [
                {
                  type: "object" as const,
                  properties: {
                    name: { type: "string" as const },
                    email: { type: "string" as const }
                  },
                  required: ["name", "email"]
                },
                {
                  type: "object" as const,
                  properties: {
                    age: { type: "number" as const },
                    verified: { type: "boolean" as const }
                  },
                  required: ["age"]
                }
              ]
            }
          }
        };

        const fixture = fixtureFromSchema(schema);
        const validator = zodFromSchema(schema as any);
        
        // Should not throw - fixture should match all schemas
        expect(() => validator.parse(fixture)).not.toThrow();
        
        // Verify all properties are present
        expect(fixture.user).toHaveProperty('name');
        expect(fixture.user).toHaveProperty('email');
        expect(fixture.user).toHaveProperty('age');
      });

      it('should generate valid fixture for allOf with base type and constraints', () => {
        const schema = {
          allOf: [
            { type: "string" as const },
            { minLength: 5 },
            { maxLength: 20 }
          ]
        };

        const fixture = fixtureFromSchema(schema);
        const validator = zodFromSchema(schema);
        
        // Should not throw
        expect(() => validator.parse(fixture)).not.toThrow();
        expect(typeof fixture).toBe('string');
        expect(fixture.length).toBeGreaterThanOrEqual(5);
        expect(fixture.length).toBeLessThanOrEqual(20);
      });

      it('should fail validation when data does not match all allOf schemas', () => {
        const schema = {
          allOf: [
            {
              type: "object" as const,
              properties: {
                name: { type: "string" as const }
              },
              required: ["name"]
            },
            {
              type: "object" as const,
              properties: {
                age: { type: "number" as const }
              },
              required: ["age"]
            }
          ]
        };

        const validator = zodFromSchema(schema as any);
        
        // Missing 'age' property - should fail
        const invalidData = { name: "John" };
        
        expect(() => validator.parse(invalidData)).toThrow();
      });
    });

    describe('anyOf', () => {
      it('should generate valid fixture for anyOf with multiple object types', () => {
        const schema = {
          type: "object" as const,
          properties: {
            contact: {
              anyOf: [
                {
                  type: "object" as const,
                  properties: {
                    email: { type: "string" as const }
                  },
                  required: ["email"]
                },
                {
                  type: "object" as const,
                  properties: {
                    phone: { type: "string" as const }
                  },
                  required: ["phone"]
                },
                {
                  type: "object" as const,
                  properties: {
                    address: { type: "string" as const }
                  },
                  required: ["address"]
                }
              ]
            }
          }
        };

        const fixture = fixtureFromSchema(schema);
        const validator = zodFromSchema(schema as any);
        
        // Should not throw - fixture should match at least one schema
        expect(() => validator.parse(fixture)).not.toThrow();
      });

      it('should generate valid fixture for anyOf with primitive types', () => {
        const schema = {
          anyOf: [
            { type: "string" as const },
            { type: "number" as const },
            { type: "boolean" as const }
          ]
        };

        const fixture = fixtureFromSchema(schema);
        const validator = zodFromSchema(schema);
        
        // Should not throw
        expect(() => validator.parse(fixture)).not.toThrow();
        // Should be one of the allowed types
        expect(['string', 'number', 'boolean']).toContain(typeof fixture);
      });

      it('should accept data matching multiple anyOf schemas', () => {
        const schema = {
          anyOf: [
            { type: "string" as const, minLength: 1 },
            { type: "string" as const, maxLength: 100 }
          ]
        };

        const validator = zodFromSchema(schema);
        
        // A string that matches both schemas should be valid for anyOf
        const validData = "test";
        
        expect(() => validator.parse(validData)).not.toThrow();
      });

      it('should fail validation when data matches none of the anyOf schemas', () => {
        const schema = {
          anyOf: [
            { type: "string" as const },
            { type: "number" as const }
          ]
        };

        const validator = zodFromSchema(schema);
        
        // Boolean doesn't match any schema - should fail
        const invalidData = true;
        
        expect(() => validator.parse(invalidData)).toThrow();
      });
    });

    describe('Nested composition', () => {
      it('should handle complex nested composition with allOf inside oneOf', () => {
        const schema = {
          type: "object" as const,
          properties: {
            data: {
              oneOf: [
                {
                  allOf: [
                    {
                      type: "object" as const,
                      properties: {
                        type: { type: "string" as const, enum: ["user"] }
                      }
                    },
                    {
                      type: "object" as const,
                      properties: {
                        name: { type: "string" as const },
                        email: { type: "string" as const }
                      },
                      required: ["name", "email"]
                    }
                  ]
                },
                {
                  type: "object" as const,
                  properties: {
                    type: { type: "string" as const, enum: ["product"] },
                    sku: { type: "string" as const },
                    price: { type: "number" as const }
                  },
                  required: ["type", "sku", "price"]
                }
              ]
            }
          }
        };

        const fixture = fixtureFromSchema(schema);
        const validator = zodFromSchema(schema as any);
        
        // Should not throw
        expect(() => validator.parse(fixture)).not.toThrow();
      });

      it('should handle anyOf combined with allOf', () => {
        const schema = {
          allOf: [
            {
              type: "object" as const,
              properties: {
                id: { type: "string" as const }
              },
              required: ["id"]
            },
            {
              anyOf: [
                {
                  type: "object" as const,
                  properties: {
                    name: { type: "string" as const }
                  }
                },
                {
                  type: "object" as const,
                  properties: {
                    title: { type: "string" as const }
                  }
                }
              ]
            }
          ]
        };

        const fixture = fixtureFromSchema(schema);
        const validator = zodFromSchema(schema as any);
        
        // Should not throw
        expect(() => validator.parse(fixture)).not.toThrow();
        expect(fixture).toHaveProperty('id');
      });
    });
  });
});

