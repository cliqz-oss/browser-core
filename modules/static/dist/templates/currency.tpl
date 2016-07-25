<div class='cqz-result-h3'>
    <div>
        <div class="EZ-currency EZ-currency-result">
            {{# if data.CurrencyFormatSuport }}
                <span class="cqz-amount">{{ data.toAmount.main }}</span>
            {{else}}
                <span class="cqz-amount">{{ localizeNumbers data.toAmount.main }}</span>
                <span class="cqz-currency-code">{{ data.toCurrency }}</span>
            {{/if}}
        </div>
        <div class="EZ-currency EZ-currency-rate">
            {{localizeNumbers data.multiplyer}} {{data.fromCurrency}} = {{convRateDigitSplit (localizeNumbers data.mConversionRate)}} {{data.toCurrency}}
            <span class="cqz-disclaimer EZ-currency-disclaimer">{{local 'no_legal_disclaimer'}}</span>
        </div>
    </div>
    {{>logo}}
</div>