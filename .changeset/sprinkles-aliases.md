---
'@vanilla-extract/sprinkles': minor
---

Add an `aliases` option to `defineProperties`

Aliases let you give an existing property value one or more additional names without generating a new utility class. This is useful for semantic token naming, where a name like `primary` should resolve to an existing scale value like `blue500`.

```ts
export const sprinkles = defineProperties({
  properties: {
    color: {
      blue500: '#3b82f6',
      red600: '#dc2626',
    },
  },
  aliases: {
    color: {
      primary: 'blue500',
      danger: 'red600',
    },
  },
});

// Resolves to the same class as `color: 'blue500'`
sprinkles({ color: 'primary' });
```

Aliases appear alongside real values in autocomplete, work with conditions and responsive arrays, and reuse the target value's class rather than emitting a duplicate. Unlike `shorthands`, which map one prop to several properties, aliases rename a value within a single property.
