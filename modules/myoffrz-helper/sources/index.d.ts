declare module 'myoffrz-helper' {

  //
  // Structure of `category-pattern.json`
  //
  type CssSelectors = string[];

  type RuleCategoryFields = {
    title?: CssSelectors;
    category: CssSelectors;
  }
  type RuleLinkFields = {
    link: CssSelectors;
    linkIdRegex: string;
  }
  type RulePriceFields = {
    title: CssSelectors;
    price: CssSelectors;
  }

  type Rule = (RuleCategoryFields | RuleLinkFields | RulePriceFields) & {
    refetch: boolean;
    waitOnLoad: boolean;
  }

  type WrappedRule = {
    patterns: Rule;
    productIdRegex?: string;
    prefix: string;
  }

  //
  //
  //
  type RuleApplication1 = {
    categories?: string[];
    productId: string | null; // Amazon Standard Identification Number, ASIN
    prefix?: string;
    styles: Rule | null; // is `patterns` in `category-pattern.json`
  }

  // the same as `RuleApplication1`, but field `styles` is renamed to `rules`
  type RuleApplication2 = {
    categories?: string[];
    productId: string | null;
    prefix?: string;
    rules: Rule | null;
  }
}

