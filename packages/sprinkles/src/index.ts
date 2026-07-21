import {
  style,
  composeStyles,
  type CSSProperties,
  type StyleRule,
} from '@vanilla-extract/css';
import { addRecipe } from '@vanilla-extract/css/recipe';
import { hasFileScope } from '@vanilla-extract/css/fileScope';

import {
  type SprinklesFn,
  createSprinkles as internalCreateSprinkles,
} from './createSprinkles';
import type { SprinklesProperties, ResponsiveArrayConfig } from './types';

export { createNormalizeValueFn, createMapValueFn } from './createUtils';
export type { ConditionalValue, RequiredConditionalValue } from './createUtils';

export type { ResponsiveArray, SprinklesProperties } from './types';

type ConditionKey =
  | '@media'
  | '@scope'
  | '@supports'
  | '@container'
  | 'selector';
type Condition = Partial<Record<ConditionKey, string>>;

type BaseConditions = { [conditionName: string]: Condition };

type AtomicCSSProperties = {
  [Property in keyof CSSProperties]?:
    | Record<string, CSSProperties[Property] | Omit<StyleRule, ConditionKey>>
    | ReadonlyArray<CSSProperties[Property]>;
};

type AtomicCustomProperties = Record<
  string,
  Record<string | number, Omit<StyleRule, ConditionKey>>
>;

type AtomicProperties = AtomicCSSProperties | AtomicCustomProperties;

type ShorthandOptions<
  Properties extends AtomicProperties,
  Shorthands extends { [shorthandName: string]: Array<keyof Properties> },
> = {
  shorthands: Shorthands;
};

// The set of valid value names for a single property, matching the keys
// produced by `Values` below.
type PropertyValueKeys<Property> =
  Property extends ReadonlyArray<any>
    ? Property[number]
    : Property extends Array<any>
      ? Property[number]
      : keyof Property;

// Maps each property to a set of aliases, where every alias points at an
// existing value name of that property.
type Aliases<Properties extends AtomicProperties> = {
  [Property in keyof Properties]?: {
    [aliasName: string]: PropertyValueKeys<Properties[Property]>;
  };
};

type UnconditionalAtomicOptions<Properties extends AtomicProperties> = {
  '@layer'?: string;
  properties: Properties;
};

type ResponsiveArrayOptions<
  Conditions extends { [conditionName: string]: Condition },
  ResponsiveLength extends number,
> = {
  responsiveArray: ResponsiveArrayConfig<keyof Conditions> & {
    length: ResponsiveLength;
  };
};

type ConditionalAtomicOptions<
  Properties extends AtomicProperties,
  Conditions extends { [conditionName: string]: Condition },
  DefaultCondition extends keyof Conditions | Array<keyof Conditions> | false,
> = UnconditionalAtomicOptions<Properties> & {
  conditions: Conditions;
  defaultCondition: DefaultCondition;
};

type Values<Property, Result> = {
  [Value in PropertyValueKeys<Property>]: Result;
};

// Adds alias value names to the generated styles. Each alias re-uses the
// exact entry type of the value it points at, so it inherits the same
// `defaultClass`/`conditions` shape without generating a new utility class.
type AliasAtomicStyles<
  BaseStyles extends {
    styles: Record<string, { values: Record<string, any> }>;
  },
  TAliases,
> = {
  styles: {
    [Property in keyof TAliases]: {
      values: {
        [Alias in keyof TAliases[Property]]: Property extends keyof BaseStyles['styles']
          ? BaseStyles['styles'][Property]['values'][keyof BaseStyles['styles'][Property]['values']]
          : never;
      };
    };
  };
};

// Intersects a base styles type with its alias value names. Alias entries are
// merged into the same `values` object, so they appear alongside real values
// in prop autocomplete.
type WithAliases<
  BaseStyles extends {
    styles: Record<string, { values: Record<string, any> }>;
  },
  TAliases,
> = BaseStyles & AliasAtomicStyles<BaseStyles, TAliases>;

type UnconditionalAtomicStyles<Properties extends AtomicProperties> = {
  conditions: never;
  styles: {
    [Property in keyof Properties]: {
      values: Values<Properties[Property], { defaultClass: string }>;
    };
  };
};

type ConditionalAtomicStyles<
  Properties extends AtomicProperties,
  Conditions extends { [conditionName: string]: Condition },
  DefaultCondition extends keyof Conditions | Array<keyof Conditions> | false,
> = {
  conditions: {
    defaultCondition: DefaultCondition;
    conditionNames: Array<keyof Conditions>;
  };
  styles: {
    [Property in keyof Properties]: {
      values: Values<
        Properties[Property],
        {
          defaultClass: DefaultCondition extends false ? undefined : string;
          conditions: {
            [Rule in keyof Conditions]: string;
          };
        }
      >;
    };
  };
};

type ConditionalWithResponsiveArrayAtomicStyles<
  Properties extends AtomicProperties,
  Conditions extends { [conditionName: string]: Condition },
  ResponsiveLength extends number,
  DefaultCondition extends keyof Conditions | Array<keyof Conditions> | false,
> = {
  conditions: {
    defaultCondition: DefaultCondition;
    conditionNames: Array<keyof Conditions>;
    responsiveArray: Array<keyof Conditions> & { length: ResponsiveLength };
  };
  styles: {
    [Property in keyof Properties]: {
      responsiveArray: Array<keyof Conditions> & { length: ResponsiveLength };
      values: Values<
        Properties[Property],
        {
          defaultClass: DefaultCondition extends false ? undefined : string;
          conditions: {
            [Rule in keyof Conditions]: string;
          };
        }
      >;
    };
  };
};

type ShorthandAtomicStyles<
  Shorthands extends {
    [shorthandName: string]: Array<string | number | symbol>;
  },
> = {
  styles: {
    [Shorthand in keyof Shorthands]: {
      mappings: Shorthands[Shorthand];
    };
  };
};

// Conditional + Shorthands + ResponsiveArray
export function defineProperties<
  Properties extends AtomicProperties,
  ResponsiveLength extends number,
  Conditions extends BaseConditions,
  Shorthands extends { [shorthandName: string]: Array<keyof Properties> },
  DefaultCondition extends keyof Conditions | Array<keyof Conditions> | false,
  TAliases extends Aliases<Properties> = {},
>(
  options: ConditionalAtomicOptions<Properties, Conditions, DefaultCondition> &
    ShorthandOptions<Properties, Shorthands> &
    ResponsiveArrayOptions<Conditions, ResponsiveLength> & {
      aliases?: TAliases;
    },
): WithAliases<
  ConditionalWithResponsiveArrayAtomicStyles<
    Properties,
    Conditions,
    ResponsiveLength,
    DefaultCondition
  >,
  TAliases
> &
  ShorthandAtomicStyles<Shorthands>;
// Conditional + Shorthands
export function defineProperties<
  Properties extends AtomicProperties,
  Conditions extends BaseConditions,
  Shorthands extends { [shorthandName: string]: Array<keyof Properties> },
  DefaultCondition extends keyof Conditions | Array<keyof Conditions> | false,
  TAliases extends Aliases<Properties> = {},
>(
  options: ConditionalAtomicOptions<Properties, Conditions, DefaultCondition> &
    ShorthandOptions<Properties, Shorthands> & {
      aliases?: TAliases;
    },
): WithAliases<
  ConditionalAtomicStyles<Properties, Conditions, DefaultCondition>,
  TAliases
> &
  ShorthandAtomicStyles<Shorthands>;
// Conditional + ResponsiveArray
export function defineProperties<
  Properties extends AtomicProperties,
  Conditions extends BaseConditions,
  ResponsiveLength extends number,
  DefaultCondition extends keyof Conditions | Array<keyof Conditions> | false,
  TAliases extends Aliases<Properties> = {},
>(
  options: ConditionalAtomicOptions<Properties, Conditions, DefaultCondition> &
    ResponsiveArrayOptions<Conditions, ResponsiveLength> & {
      aliases?: TAliases;
    },
): WithAliases<
  ConditionalWithResponsiveArrayAtomicStyles<
    Properties,
    Conditions,
    ResponsiveLength,
    DefaultCondition
  >,
  TAliases
>;
// Conditional
export function defineProperties<
  Properties extends AtomicProperties,
  Conditions extends BaseConditions,
  DefaultCondition extends keyof Conditions | Array<keyof Conditions> | false,
  TAliases extends Aliases<Properties> = {},
>(
  options: ConditionalAtomicOptions<
    Properties,
    Conditions,
    DefaultCondition
  > & {
    aliases?: TAliases;
  },
): WithAliases<
  ConditionalAtomicStyles<Properties, Conditions, DefaultCondition>,
  TAliases
>;
// Unconditional + Shorthands
export function defineProperties<
  Properties extends AtomicProperties,
  Shorthands extends { [shorthandName: string]: Array<keyof Properties> },
  TAliases extends Aliases<Properties> = {},
>(
  options: UnconditionalAtomicOptions<Properties> &
    ShorthandOptions<Properties, Shorthands> & {
      aliases?: TAliases;
    },
): WithAliases<UnconditionalAtomicStyles<Properties>, TAliases> &
  ShorthandAtomicStyles<Shorthands>;
// Unconditional
export function defineProperties<
  Properties extends AtomicProperties,
  TAliases extends Aliases<Properties> = {},
>(
  options: UnconditionalAtomicOptions<Properties> & {
    aliases?: TAliases;
  },
): WithAliases<UnconditionalAtomicStyles<Properties>, TAliases>;
export function defineProperties(options: any): any {
  let styles: any =
    'shorthands' in options
      ? Object.fromEntries(
          Object.entries(options.shorthands).map(([prop, mappings]) => [
            prop,
            { mappings },
          ]),
        )
      : {};

  for (const key in options.properties) {
    const property = options.properties[key as keyof typeof options.properties];
    styles[key] = {
      values: {},
    };

    if ('responsiveArray' in options) {
      styles[key].responsiveArray = options.responsiveArray;
    }

    const processValue = (
      valueName: keyof typeof property,
      value: string | number | StyleRule,
    ) => {
      if ('conditions' in options) {
        styles[key].values[valueName] = {
          conditions: {},
        };

        const defaultConditions = options.defaultCondition
          ? Array.isArray(options.defaultCondition)
            ? options.defaultCondition
            : [options.defaultCondition]
          : [];

        const defaultClasses = [];

        for (const conditionName in options.conditions) {
          let styleValue: StyleRule =
            typeof value === 'object' ? value : { [key]: value };

          const condition =
            options.conditions[
              conditionName as keyof typeof options.conditions
            ];

          if (condition['@supports']) {
            styleValue = {
              '@supports': {
                [condition['@supports']]: styleValue,
              },
            };
          }

          if (condition['@container']) {
            styleValue = {
              '@container': {
                [condition['@container']]: styleValue,
              },
            };
          }

          if (condition['@media']) {
            styleValue = {
              '@media': {
                [condition['@media']]: styleValue,
              },
            };
          }

          if (condition['@scope']) {
            styleValue = {
              '@scope': {
                [condition['@scope']]: styleValue,
              },
            };
          }

          if (condition.selector) {
            styleValue = {
              selectors: {
                [condition.selector]: styleValue,
              },
            };
          }

          if (options['@layer']) {
            styleValue = {
              '@layer': {
                [options['@layer']]: styleValue,
              },
            };
          }

          const className = style(
            styleValue,
            `${key}_${String(valueName)}_${conditionName}`,
          );

          styles[key].values[valueName].conditions[conditionName] = className;

          if (defaultConditions.indexOf(conditionName) > -1) {
            defaultClasses.push(className);
          }
        }

        if (defaultClasses.length > 0) {
          styles[key].values[valueName].defaultClass = defaultClasses.join(' ');
        }
      } else {
        let styleValue: StyleRule =
          typeof value === 'object' ? value : { [key]: value };

        if (options['@layer']) {
          styleValue = {
            '@layer': {
              [options['@layer']]: styleValue,
            },
          };
        }

        styles[key].values[valueName] = {
          defaultClass: style(styleValue, `${key}_${String(valueName)}`),
        };
      }
    };

    if (Array.isArray(property)) {
      for (const value of property) {
        processValue(value, value);
      }
    } else {
      for (const valueName in property) {
        const value = property[valueName];
        processValue(valueName, value);
      }
    }
  }

  // Aliases point a new value name at an existing value's already-generated
  // classes. They re-use the same entry object, so no additional utility
  // classes are created.
  if ('aliases' in options) {
    for (const key in options.aliases) {
      const propertyAliases = options.aliases[key];

      if (process.env.NODE_ENV !== 'production') {
        if (!styles[key]?.values) {
          throw new Error(
            `Sprinkles: alias references unknown property "${key}"`,
          );
        }
      }

      for (const aliasName in propertyAliases) {
        const targetValueName = propertyAliases[aliasName];

        if (process.env.NODE_ENV !== 'production') {
          if (!(targetValueName in styles[key].values)) {
            throw new Error(
              `Sprinkles: alias "${key}.${aliasName}" references unknown value "${String(
                targetValueName,
              )}"`,
            );
          }
        }

        styles[key].values[aliasName] = styles[key].values[targetValueName];
      }
    }
  }

  const conditions =
    'conditions' in options
      ? {
          defaultCondition: options.defaultCondition,
          conditionNames: Object.keys(options.conditions),
          responsiveArray: options.responsiveArray,
        }
      : undefined;

  return { conditions, styles };
}

const mockComposeStyles = (classList: string) => classList;

export function createSprinkles<
  Args extends ReadonlyArray<SprinklesProperties>,
>(...config: Args): SprinklesFn<Args> {
  // When using Sprinkles with the runtime (e.g. within a jest test)
  // `style` can be called (only for composition) outside of a fileScope.
  // Checking we're within a fileScope ensures this doesn't blow up and is
  // safe as compositions don't make sense at runtime
  const sprinkles = internalCreateSprinkles(
    hasFileScope() ? composeStyles : mockComposeStyles,
  )(...config);

  return addRecipe(sprinkles, {
    importPath: '@vanilla-extract/sprinkles/createRuntimeSprinkles',
    importName: 'createSprinkles',
    args: config,
  });
}

export {
  /** @deprecated - Use `defineProperties` */
  defineProperties as createAtomicStyles,
  /** @deprecated - Use `createSprinkles` */
  createSprinkles as createAtomsFn,
};
