var ENGINES = [
    {
        "name": "Google",
        "alias": "#go",
        "icon": "data:image/x-icon;base64,AAABAAIAEBAAAAAAAAB9AQAAJgAAACAgAAAAAAAA8gIAAKMBAACJUE5HDQoaCgAAAA1JSERSAAAAEAAAABAIBgAAAB/z/2EAAAFESURBVDjLpZNJSwNBEIXnt4lE4kHxovgT9BDwJHqPy0HEEOJBiAuCRg+KUdC4QS4KrpC4gCBGE3NQ48JsnZ6eZ3UOM6gjaePhQU93v6+qq2q0pqgeJj2S8EdJT1hr0OxBtKCD5iEd8QxDYpvhvOBAuMDKURX9C9aPu4GA1GEVkzvMg10UBfYveWAWgYAP00V01fa+R9M2bA51wJvhIn3qR+ybt3D3JNQBE5sMjCIOLFpoHzOwdsLRO22qA6R6kiZiWwxUvy/PUQZIhYZ1vFM9cvcOOsYNdcBgysISdSJBnZjJMlR0Fw8vAp0xoz5gao/h+NZBy4i/10XGwrPA+hmvDyhVRG2Avu/LwcrkFADZa16L1h330w1RNgc3DiJzCpPYRm1bpveXX11clQR28xwblHpk1vq1iP/5mcoS0CoXDZiL0vsJ+dzfl+3T/VYAAAAASUVORK5CYIKJUE5HDQoaCgAAAA1JSERSAAAAIAAAACAIBgAAAHN6evQAAAK5SURBVFjDxVfrSxRRFJ9/Jta/oyWjF5XQm6D6EkHRgygIIgjUTcueVgqVWSRRkppEUQYWWB8ye1iGWilWlo/Ude489s7M6Zw7D9dlt53dmd29cFiWvXvO77x+51xpaaUsoSxBaUWZQ4ECy5xji2xKZDyCMlMEw6lCNiOSgwZKJK1SkcKeSealfP64t0mBjl4Ow39MkDUL0p2RSROOtqhZdeUEYM1pBl39XCg/fEeFtWcY7G9W4csvUxjlBkCsQ4Nt9QyWVfvT6RsAKXw3aoDGATZeYIt+W1kjw7cJG0RctWDTRebbKd8A6h5pwsDb70ba3w/eUr3wt/cmwgfw6Yft4TNMQaY7o1P2ncm4FT4ANQH/jQBJ2xv7kqIXEADDql8eS3+n8bku7oxNm+EDIM/dU92upb3T/NJGeaNbDx/AsbsLRUY5Xn92caWXY5d8RV6gWllxSg4fAEnTC90DQW13BLlgXR2D3dcUeDVkwOthA1bXspxILWcm3HdThcfvufB26LcJpkOEAz9NKI/lzqpSEC7feol5EWnpSeSlIxCALUkApmULdjUqxQVAQnl3D/X/yQda4QBEq2TYc12By091MQ17Bg3R88nHKlQbVmHvj89awNBLYrwT9zXY2aBAxTkGFdiSxP/Jp6FLDw+AS7GfsdJTJ2EqSO5khD43nGfBARy/ZxOQgZHe7GPM1jzUvChUtmnBAXQPcKGMJp3fdFGq6NByEhiAO4b/YptFfQJwNyQ/bZkVQGcf90Ja25ndIyrKBOa/f8wIpwi3X1G8UcxNu7ozUS7tiH0jBswwS3RIaF1w6LYKU/ML2+8sGnjygQswtKrVIy/Qd9qQP6LnO64q4fPAKpxyZIymHo1jWk6p1ag2BsdNwQMHcC+M5kHFJX+YlPxpVlbCx2mZ5DzPI04k4kUwHHdskU3pH76iftG8yWlkAAAAAElFTkSuQmCC",
        "code": 3,
        "searchForm": "https://www.google.com/search?q=&ie=utf-8&oe=utf-8"
    },
    {
        "name": "Bing",
        "alias": "#bi",
        "icon": "data:image/x-icon;base64,AAABAAIAEBAAAAEACADaCwAAJgAAACAgAAABAAgAlAIAAAAMAACJUE5HDQoaCgAAAA1JSERSAAAAEAAAABAIAgAAAJCRaDYAAAAJcEhZcwAACxMAAAsTAQCanBgAAApPaUNDUFBob3Rvc2hvcCBJQ0MgcHJvZmlsZQAAeNqdU2dUU+kWPffe9EJLiICUS29SFQggUkKLgBSRJiohCRBKiCGh2RVRwRFFRQQbyKCIA46OgIwVUSwMigrYB+Qhoo6Do4iKyvvhe6Nr1rz35s3+tdc+56zznbPPB8AIDJZIM1E1gAypQh4R4IPHxMbh5C5AgQokcAAQCLNkIXP9IwEA+H48PCsiwAe+AAF40wsIAMBNm8AwHIf/D+pCmVwBgIQBwHSROEsIgBQAQHqOQqYAQEYBgJ2YJlMAoAQAYMtjYuMAUC0AYCd/5tMAgJ34mXsBAFuUIRUBoJEAIBNliEQAaDsArM9WikUAWDAAFGZLxDkA2C0AMElXZkgAsLcAwM4QC7IACAwAMFGIhSkABHsAYMgjI3gAhJkAFEbyVzzxK64Q5yoAAHiZsjy5JDlFgVsILXEHV1cuHijOSRcrFDZhAmGaQC7CeZkZMoE0D+DzzAAAoJEVEeCD8/14zg6uzs42jrYOXy3qvwb/ImJi4/7lz6twQAAA4XR+0f4sL7MagDsGgG3+oiXuBGheC6B194tmsg9AtQCg6dpX83D4fjw8RaGQudnZ5eTk2ErEQlthyld9/mfCX8BX/Wz5fjz89/XgvuIkgTJdgUcE+ODCzPRMpRzPkgmEYtzmj0f8twv//B3TIsRJYrlYKhTjURJxjkSajPMypSKJQpIpxSXS/2Ti3yz7Az7fNQCwaj4Be5EtqF1jA/ZLJxBYdMDi9wAA8rtvwdQoCAOAaIPhz3f/7z/9R6AlAIBmSZJxAABeRCQuVMqzP8cIAABEoIEqsEEb9MEYLMAGHMEF3MEL/GA2hEIkxMJCEEIKZIAccmAprIJCKIbNsB0qYC/UQB00wFFohpNwDi7CVbgOPXAP+mEInsEovIEJBEHICBNhIdqIAWKKWCOOCBeZhfghwUgEEoskIMmIFFEiS5E1SDFSilQgVUgd8j1yAjmHXEa6kTvIADKC/Ia8RzGUgbJRPdQMtUO5qDcahEaiC9BkdDGajxagm9BytBo9jDah59CraA/ajz5DxzDA6BgHM8RsMC7Gw0KxOCwJk2PLsSKsDKvGGrBWrAO7ifVjz7F3BBKBRcAJNgR3QiBhHkFIWExYTthIqCAcJDQR2gk3CQOEUcInIpOoS7QmuhH5xBhiMjGHWEgsI9YSjxMvEHuIQ8Q3JBKJQzInuZACSbGkVNIS0kbSblIj6SypmzRIGiOTydpka7IHOZQsICvIheSd5MPkM+Qb5CHyWwqdYkBxpPhT4ihSympKGeUQ5TTlBmWYMkFVo5pS3aihVBE1j1pCraG2Uq9Rh6gTNHWaOc2DFklLpa2ildMaaBdo92mv6HS6Ed2VHk6X0FfSy+lH6JfoA/R3DA2GFYPHiGcoGZsYBxhnGXcYr5hMphnTixnHVDA3MeuY55kPmW9VWCq2KnwVkcoKlUqVJpUbKi9Uqaqmqt6qC1XzVctUj6leU32uRlUzU+OpCdSWq1WqnVDrUxtTZ6k7qIeqZ6hvVD+kfln9iQZZw0zDT0OkUaCxX+O8xiALYxmzeCwhaw2rhnWBNcQmsc3ZfHYqu5j9HbuLPaqpoTlDM0ozV7NS85RmPwfjmHH4nHROCecop5fzforeFO8p4ikbpjRMuTFlXGuqlpeWWKtIq1GrR+u9Nq7tp52mvUW7WfuBDkHHSidcJ0dnj84FnedT2VPdpwqnFk09OvWuLqprpRuhu0R3v26n7pievl6Ankxvp955vef6HH0v/VT9bfqn9UcMWAazDCQG2wzOGDzFNXFvPB0vx9vxUUNdw0BDpWGVYZfhhJG50Tyj1UaNRg+MacZc4yTjbcZtxqMmBiYhJktN6k3umlJNuaYppjtMO0zHzczNos3WmTWbPTHXMueb55vXm9+3YFp4Wiy2qLa4ZUmy5FqmWe62vG6FWjlZpVhVWl2zRq2drSXWu627pxGnuU6TTque1mfDsPG2ybaptxmw5dgG2662bbZ9YWdiF2e3xa7D7pO9k326fY39PQcNh9kOqx1aHX5ztHIUOlY63prOnO4/fcX0lukvZ1jPEM/YM+O2E8spxGmdU5vTR2cXZ7lzg/OIi4lLgssulz4umxvG3ci95Ep09XFd4XrS9Z2bs5vC7ajbr+427mnuh9yfzDSfKZ5ZM3PQw8hD4FHl0T8Ln5Uwa9+sfk9DT4FntecjL2MvkVet17C3pXeq92HvFz72PnKf4z7jPDfeMt5ZX8w3wLfIt8tPw2+eX4XfQ38j/2T/ev/RAKeAJQFnA4mBQYFbAvv4enwhv44/Ottl9rLZ7UGMoLlBFUGPgq2C5cGtIWjI7JCtIffnmM6RzmkOhVB+6NbQB2HmYYvDfgwnhYeFV4Y/jnCIWBrRMZc1d9HcQ3PfRPpElkTem2cxTzmvLUo1Kj6qLmo82je6NLo/xi5mWczVWJ1YSWxLHDkuKq42bmy+3/zt84fineIL43sXmC/IXXB5oc7C9IWnFqkuEiw6lkBMiE44lPBBECqoFowl8hN3JY4KecIdwmciL9E20YjYQ1wqHk7ySCpNepLskbw1eSTFM6Us5bmEJ6mQvEwNTN2bOp4WmnYgbTI9Or0xg5KRkHFCqiFNk7Zn6mfmZnbLrGWFsv7Fbou3Lx6VB8lrs5CsBVktCrZCpuhUWijXKgeyZ2VXZr/Nico5lqueK83tzLPK25A3nO+f/+0SwhLhkralhktXLR1Y5r2sajmyPHF52wrjFQUrhlYGrDy4irYqbdVPq+1Xl65+vSZ6TWuBXsHKgsG1AWvrC1UK5YV969zX7V1PWC9Z37Vh+oadGz4ViYquFNsXlxV/2CjceOUbh2/Kv5nclLSpq8S5ZM9m0mbp5t4tnlsOlqqX5pcObg3Z2rQN31a07fX2Rdsvl80o27uDtkO5o788uLxlp8nOzTs/VKRU9FT6VDbu0t21Ydf4btHuG3u89jTs1dtbvPf9Psm+21UBVU3VZtVl+0n7s/c/romq6fiW+21drU5tce3HA9ID/QcjDrbXudTVHdI9VFKP1ivrRw7HH77+ne93LQ02DVWNnMbiI3BEeeTp9wnf9x4NOtp2jHus4QfTH3YdZx0vakKa8ppGm1Oa+1tiW7pPzD7R1ureevxH2x8PnDQ8WXlK81TJadrpgtOTZ/LPjJ2VnX1+LvncYNuitnvnY87fag9v77oQdOHSRf+L5zu8O85c8rh08rLb5RNXuFearzpfbep06jz+k9NPx7ucu5quuVxrue56vbV7ZvfpG543zt30vXnxFv/W1Z45Pd2983pv98X39d8W3X5yJ/3Oy7vZdyfurbxPvF/0QO1B2UPdh9U/W/7c2O/cf2rAd6Dz0dxH9waFg8/+kfWPD0MFj5mPy4YNhuueOD45OeI/cv3p/KdDz2TPJp4X/qL+y64XFi9++NXr187RmNGhl/KXk79tfKX96sDrGa/bxsLGHr7JeDMxXvRW++3Bd9x3He+j3w9P5Hwgfyj/aPmx9VPQp/uTGZOT/wQDmPP8YzMt2wAAACBjSFJNAAB6JQAAgIMAAPn/AACA6QAAdTAAAOpgAAA6mAAAF2+SX8VGAAABBUlEQVR42mL8v4OBJMAEZ/0nTgMLnLXtitKRO9JmCi9cNR/wsP8mrOHfP8YbL4RvvBBWFXuvI/WGsJMYSHUSMujbY8LN/ttM4bmO1BtW5n+ENdipPmndbrHjqiIn6x9DuZc2yk8tlZ7hc5Kx/AtzxecMDAzff7Mcuys9/7gOAT8wMjAUOZ9x0XhI2A98HL+Eub/vuSG/8ozGmy+cEEF+zp/YNYjxfvPTv9O63fLpBx6ICCvz32DD24EGt7Fo4Gb/zcX2Z84RPbiIqfyLZJtL4rzfsDvJUf3R91+sC09o//7LJMn/NdXmkqHsSyzeQ0t8j9/znn8s7ql9Dy34cWogIbUSCQADAJ+jWQrH9LCsAAAAAElFTkSuQmCCiVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAIAAAD8GO2jAAACW0lEQVR4nGP8v5OBpoCJtsbTwQIWTKGUxe5mCi9M5V/oSL9mZf5HoQWMmHEQOD0AwuBg/WMo+8pB/ZGZwguyLcDiAzj48Zvl+D2pTz/YKLGAcBxcfSZCtulEWUAhGDQW3HstcOOF8P//jKRagC+SkQE/58/0pa7c7L9N5V+aKTw3kH3FxvKXmhYI83y3VXl64Jbs3htye2/IsbH8NZB9Zabw3FT+JR/nTypYwMDAEGBw+8AtWQj71x/mU/clT92XZGT8ry7+zlzxhbnic0n+LxRZIC/8yUju5blH4siC//8z3nghfOOF8MLj2jKCnydH7EXTRVoqCjC4g0f2yXteTEHSLNCVft0WcNhM4QXxiYmEIIIATcm3mpJvn37gmX7Q8OozYYLqycloTz/wLDulRYzpDMT4QFf6NZz95gvnyjMa+27I/SM6xxGwQJj7R6rtJQYGhk8/2NaeU9t+RfH3X2ZcihWEP5Fmgazg53qfY9zsv1ed0dh4UeXbL5yKudl/R5tdd9O6T4IFGhJvyz1OHbkts/qc2qfv7LiUMTIwOGk8irW4yo8jP2O3wEzxubHcy7I1Dq+/cOIymoGBQVn0Q5rtRTXx93jUYLFAX+b1sw88p+5L4tHGy/Er2uy6m9YDRsb/eJRht8BS+emCY7q4NDAyMLhpPYixuMbD/gu/0VD1WBtezz7w9O81vvNKEE1cTfxdmu0lZdEPxBiNzwIGBoa//xhXndFYfU4NUsnwcf6Ms7jmpPGQ1BoHpwUQcOOF0OT9RoayryJNr3Oz/ybRcCIsoBwMmkp/8FoAADmgy6ulKggYAAAAAElFTkSuQmCC",
        "code": 5,
        "searchForm": "https://www.bing.com/search?q=&pc=MOZI"
    },
    {
        "name": "Google Images",
        "alias": "#gi",
        "icon": "data:image/gif;base64,R0lGODlhEgANAOMKAAAAABUVFRoaGisrKzk5OUxMTGRkZLS0tM/Pz9/f3////////////////////////yH5BAEKAA8ALAAAAAASAA0AAART8Ml5Arg3nMkluQIhXMRUYNiwSceAnYAwAkOCGISBJC4mSKMDwpJBHFC/h+xhQAEMSuSo9EFRnSCmEzrDComAgBGbsuF0PHJq9WipnYJB9/UmFyIAOw==",
        "code": 1,
        "searchForm": "http://www.google.de"
    },
    {
        "name": "Google Maps",
        "alias": "#gm",
        "icon": "data:image/vnd.microsoft.icon;base64,AAABAAEAEBAAAAEACABoBQAAFgAAACgAAAAQAAAAIAAAAAEACAAAAAAAAAEAABILAAASCwAAAAEAAAABAAA+VeMAZMbFAH7k/wBGy/4A/8hpAITk/wAsPNkAE8P8AFXc/wBF2f8A/8BRAP+5OwAh0v8Aqev/AExm6QA21v8A/cpwAAXJ/wAa0f8A/8dmAP/GYgCa6f8A/8NZAFzd/wCT5/8A/8VeAP++SgAq1P8ABc3/ADRI3gADy/8AKc7+AFRx7gCktfgA/sBPAP/CVgBx4f8ALdP/AAHM/wBAWeUA/7tBADpP4QCJ5f8APtj/ACg31gCi6v8A/71GAL/v/wBFydoAJTjUAB5s3wC8y6AANsD9ACvG/gBNauwAnbWRAKPJ9QCmvpQALdT/ABojzgBRZOAAue7/ACBJ1wAyRdwAFsX0AD2y8QAXz/8AEhnKAJXo/wBoheEA18B3AJ3JqQAKx/4AIS3SAN/OjgAJyP4A+MFfAPf4/gD4wWAAXnzxABWn7gAdvv0Aat//ACY01QA3St4ADcr2AGrI+gA5xuoAPMv0ADrM/gAny/UAM9D+ADHV/wBWgu4AS9r/AI+n7gClrvAAjsetAEnW/gA0xNwAOdf/ACfT/wCO5v8AJ1LXAJ+m7QBed+4AR2LpABjP/wANyPoAcbT0AAzO/wALN80AW27nAEvG0QAV0P8A4r9xADjS/gA0XNsAPdf/AC4/2gCe6f8ARV/oAP+4NgB1wbYAQNH+ANLz/wAAzP8A////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAf2J0Hx9YMxAQBBMZFgoifxIlaxERMAQTFBkjChooCwt4DSRlJkcQe3tGGRYKGih6JAUYfRcBSh4RQDlOFiIuCxIrGw99ZGNVHhFIexkjGigbXg8MBSpvHH4eEQEUFgouKxcJXAI4Q2wcfh5hExkKGghSCAkqXztQbiYmcXNMNzckAiQXRDxJMmUSckJaVzU0ZhgqAm13LDFBDzobJVtZAxgVKlYnHXcsPgccfh5LB1ENDRVdJykdd1NFfX19fX19Lz0tIGonKT8GZ3YPfHx8A38vLU82eQBUd3V8fHx8fH9/f38hIA4nKVRof39/f39/f39/TSFpDnBgf39/f39/f4ABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAQAA4D8AAOB/AAA=",
        "code": 2,
        "searchForm": "http://maps.google.de"
    },
    {
        "name": "DuckDuckGo",
        "alias": "#du",
        "icon": "data:image/icon;base64,AAABAAIAEBAAAAEAIABoBAAAJgAAACAgAAABACAAqBAAAI4EAAAoAAAAEAAAACAAAAABACAAAAAAAAAEAAATCwAAEwsAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA11RgALs6oACbQ9wAj0v8AI9L/ACfQ9wAu0agANdUYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAzzN4CNdL/oK/z//////////////////////+jsPv/BDXX/wAz0t4AAAAAAAAAAAAAAAAAAAAAAAAAAAAyzvNSduD//////8jK/v+P+Lf/IbQL/17RPP+J3Y//wOKX//////9YeuX/ADLO8wAAAAAAAAAAAAAAAAAw091piOX/8/X9/1Fx5P9xhu//WOWZ/0W9Lv9Lwjn/J8BB/xyDAP9bdfL/9fP//2mI5v8AMNPdAAAAAAc610YRQ9f//////0Zr4P8AGdD/sb32////////////wrv//wAh1/8MPab/ACPc/05r4///////EkPX/wc610YANtWkrr/y/6S48P8AJ9L/AB3R/+/w/v///////////3+D7f8AQeL/AYTw/wFr5/8AMNb/p7Tv/6698v8AM9WkADLW//////8yXt//AC3V/wAw1/////////////z///8A0P7/AKb1/wWI7P8AuPf/AJ3w/zZW3P//////ADHV/wAx2P//////AzrZ/wAu1/84ZOL////////////e////AND//wC1+f8Atff/AZbv/wY62f8ELNf//////wAw1/8AMtn//////wAw2f8ALNn/kKrz////+//cwbH////////////R////Rcb8/wDO/f8A/P//AHzo//////8AMNj/ADXa//////8vXuL/ACna/4yq9///79T/jUkg/9i+r///////r2Q0/7Cozv8BKdr/AirY/zdZ4P//////ADTa/wI72tOuv/T/prr0/wAl2v+JqPb//7yW/+bUxv/9+/n////u//W+n/+Op/L/ADPd/wAv2v+ru/T/r7/0/wI72tMLQd1DEEjg//////9Cbef/ADng///////////////////////R3///AC3g/wAy3v9SeOn//////xFI4P8LQd1DAAAAAAM64PNmiuz/9/j//2mN7f/m7P3///////////9Cb+n/ACXd/wAt3v9rju3//////2iL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/P8J0vz/ELDz/xt85v8mSdj/JknY/yZJ2P8lStowJUjXYCZJ2P8nSdhwJErZryZK2f8oSNcgJUnajyZK2f8mStn/JkrZ/yZK2f8mStn/iJPA////////////////////////////0ff+/xjV/P8J0vz/Drn1/xiO6/8Yjuv/GI7r/xCw8/8Lyvr/CdL8/xmF6P8mStn/JkrZ/yVJ2o8oSNcgJkrZ/yRK2a8jStrfI0rZ3wAAAAAlSdq/Jkra/yZK2v8mStr/Jkra/yZK2v+xtsf///////////////////////////8o2Pz/CdL8/wvK+v8mStr/Jkra/yZK2v8mStr/Jkra/yZK2v8iW97/Jkra/yZK2v8mStr/JUnavwAAAAAjStnfI0ra3yZK2v8lSdq/AAAAACZH2O8mStr/Jkra/yZK2v8mStr/L1HY/9HR0f///////////////////////////yjY/P8J0vz/CdL8/xCw9P8QsPT/ELD0/xSf7/8ddeX/Jkra/yZK2v8mStr/Jkra/yZK2v8mR9jvAAAAACVJ2r8mStr/Jkvb/yVJ2r8AAAAAJkvb/yZL2/8mS9v/Jkvb/yZL2/9KZtL/4+Pj////////////////////////////4Pn//0fd/f8J0vz/CdL8/wnS/P8J0vz/CdL8/wnS/P8Lyvr/Fpfu/yJc3/8mS9v/Jkvb/yZL2/8AAAAAJUnavyZL2/8mS9z/JUncvwAAAAAmS9z/Jkvc/yZL3P8mS9z/Jkvc/26AyP/x8fH//////////////////////////////////////9H3/v/C9P7/o+7+/2fa+/8Oufb/CdL8/wnS/P8J0vz/CdL8/xiP7P8mS9z/Jkvc/wAAAAAlSdy/Jkvc/yZM3P8lTNy/AAAAACZJ2e8mTNz/Jkzc/yZM3P8mTNz/iJTB////////////qnth/5VaOf/x6eX///////////////////////Hp5f/x6eX/ydL2/yZM3P8kVN7/G37o/xKo8v8QsfT/HXbm/yZM3P8mSdnvAAAAACVM3L8mTNz/I0vc3yZJ2u8AAAAAJUzevyZM3f8mTN3/Jkzd/yZM3f+fqc3///////////+VWjn/v5yI/+re1///////////////////////jk8s/7iRe//J0vb/Jkzd/yZM3f8mTN3/Jkzd/yZM3f8mTN3/Jkzd/yVM3r8AAAAAI0vc3yNL3N8kTd2vJk3d/yhQ3yAlTd2PJk3d/yZN3f8mTd3/Jk3d/6St0v////////////Hp5f/q3tf///////////////////////////+xhm7/49PK/6Cx8P8mTd3/Jk3d/yZN3f8mTd3/Jk3d/yZN3f8mTd3/JU3djyhQ3yAmTd3/JE3drydN33AmTd7/J03fcCVK3zAmTd7/Jk3e/yZN3v8mTd7/pK7S///////Sp5r/////////////////////////////////////////////////T27k/yZN3v8mTd7/Jk3e/yZN3v8mTd7/Jk3e/yZN3v8lSt8wJ03fcCZN3v8nTd9wKFDfICZO3/8mTt3PAAAAACVN3r8mTt//Jk7f/yZO3/+EltX//////+fRyv/SqaD/59LO///////////////////////at63/vIBy/7Glxf8mTt//Jk7f/yZO3/8mTt//Jk7f/yZO3/8mTt//JU3evwAAAAAmTt3PJk7f/yhQ3yAAAAAAJE/dryZO3/8oUN9AKFDfQCZO3/8mTt//Jk7f/zhb2v/o6/T/////////////////////////////////////////////////XHrn/yZO3/8mTt//Jk7f/yZO3/8mTt//Jk7f/yZO3/8oUN9AKFDfQCZO3/8kT92vAAAAAAAAAAAoUN9AJk7g/yZO4M8AAAAAJk/hnyZO4P8mTuD/Jk7g/05v5v/k6fv//////////////////////////////////////3eR7P8mTuD/Jk7g/yZO4P8mTuD/Jk7g/yZO4P8mTuD/Jk/hnwAAAAAmTuDPJk7g/yhQ30AAAAAAAAAAAAAAAAAjT+GfJU/h/yVO4Y8gUN8QIk7gzyVP4f8lT+H/SWnW/0lp1v+bq+H/8fHx/////////////////6Cy8v9OcOb/JU/h/yVP4f8lT+H/JU/h/yVP4f8lT+H/JU/h/yJO4M8gUN8QJU7hjyVP4f8jT+GfAAAAAAAAAAAAAAAAAAAAACBQ3xAlTOHvJU/h/yVQ4mAgUN8QIk7hzyVP4f+ktOv///////////////////////H0/f9phur/JU/h/yVP4f8lT+H/JU/h/yVP4f8lT+H/JU/h/yVP4f8iTuHPIFDfECVQ4mAlT+H/JUzh7yBQ3xAAAAAAAAAAAAAAAAAAAAAAAAAAACVQ3zAlUOLvJVDi/yVQ4mAgUN8QI1Din4mb2//J0/j/ydP4/6299P93ku3/M1vk/yVQ4v8lUOL/JVDi/yVQ4v8lUOL/JVDi/yVQ4v8lUOL/I1DinyBQ3xAlUOJgJVDi/yVQ4u8lUN8wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACVQ5DAlUOLvJVDi/yVQ4o8AAAAAJFDjQCVQ4r8lUOL/JVDi/yVQ4v8lUOL/JVDi/yVQ4v8lUOL/JVDi/yVQ4v8lUOL/JVDivyRQ40AAAAAAJVDijyVQ4v8lUOLvJVDkMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACVQ5DAjUeTfJVHj/yNR5N8kUONAAAAAACVQ5DAmUuOAJVHivyNR5N8lUeP/JVHj/yNR5N8lUeK/JlLjgCVQ5DAAAAAAJFDjQCNR5N8lUeP/I1Hk3yVQ5DAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACBQ3xAjUuSfJVHk/yVR5P8jUeTfJFLkcChQ5yAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoUOcgJFLkcCNR5N8lUeT/JVHk/yNS5J8gUN8QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAkUONAI1LknyVS5P8lUuT/JVLk/yVS5O8lUeS/JVHkvyVR5L8lUeS/JVLk7yVS5P8lUuT/JVLk/yRS468kUONAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIFDfECVS5GAjUuWfIlPlzyVS5f8lUuX/JVLl/yVS5f8iU+XPI1LlnyVS5GAgUN8QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/AA///AAD//AAAP/ggBB/wgAEP4AAAB8AAAAPAAAADiAAAEYAAAAEQAAAIAAAAAAAAAAAgAAAEIAAABCAAAAQgAAAEIAAABCAAAAQAAAAAAAAAABAAAAiAAAABiAAAEcAAAAPAAAAD4AAAB/CAAQ/4IAQf/AfgP/8AAP//wAP/",
        "code": 0,
        "searchForm": "https://duckduckgo.com"
    },
];

var CLIQZEnvironment = {
  BRANDS_DATA_URL: 'static/brands_database.json',
  TEMPLATES_PATH: 'modules/static/templates/',
  LOCALE_PATH: 'modules/static/locale/',
  MIN_QUERY_LENGHT_FOR_EZ: 0,
  RERANKERS: [],
  TEMPLATES: {'calculator': 1, 'clustering': 1, 'currency': 1, 'custom': 1, 'emphasis': 1, 'empty': 1,
    'generic': 1, /*'images_beta': 1,*/ 'main': 1, 'results': 1, 'text': 1, 'series': 1,
    'spellcheck': 1,
    'pattern-h1': 3, 'pattern-h2': 2, 'pattern-h3': 1, 'pattern-h3-cluster': 1,
    'pattern-hm': 1,
    'entity-portal': 3, 'topsites': 3,
    'celebrities': 2, 'Cliqz': 2, 'entity-generic': 2, 'noResult': 3, 'stocks': 2, 'weatherAlert': 3, 'entity-news-1': 3,'entity-video-1': 3,
    'entity-search-1': 2, 'flightStatusEZ-2': 2, 'weatherEZ': 2, 'commicEZ': 3,
    'news' : 1, 'people' : 1, 'video' : 1, 'hq' : 1,
    'ligaEZ1Game': 2,
    'ligaEZUpcomingGames': 3,
    'ligaEZTable': 3,
    'local-movie-sc':3,
    'local-cinema-sc':3,
    'local-data-sc': 2,
    'recipe': 3,
    'rd-h3-w-rating': 1,
    'ez-generic-2': 3,
    'cpgame_movie': 3,
    'delivery-tracking': 2,
    'vod': 3,
    'conversations': 1,
    'conversations_future': 1,
    'topnews': 1,
    '_generic': 1,
    '_history': 1,
    'liveTicker': 3
  },
  MESSAGE_TEMPLATES: [
    'footer-message',
    'onboarding-callout',
    'onboarding-callout-extended',
    'slow_connection',
    'partials/location/missing_location_2',
    'partials/location/no-locale-data'
  ],
  PARTIALS: [
      'url',
      'logo',
      'EZ-category',
      'partials/ez-title',
      'partials/ez-url',
      'partials/ez-history',
      'partials/ez-description',
      'partials/ez-generic-buttons',
      'EZ-history',
      'rd-h3-w-rating',
      'pcgame_movie_side_snippet',
      'partials/location/local-data',
      'partials/location/missing_location_1',
      'partials/timetable-cinema',
      'partials/timetable-movie',
      'partials/music-data-sc',
      'partials/streaming',
      'partials/lyrics'
  ],
  GOOGLE_ENGINE: {name:'Google', url: 'http://www.google.com/search?q='},
  log: function(msg, key){
    console.log('[[' + key + ']]', msg);
  },
  telemetry: function(msg) {
    // TODO: Implement telemetry on Chromium
  },
  isUnknownTemplate: function(template){
     // in case an unknown template is required
     return template &&
            !CLIQZEnvironment.TEMPLATES[template]
  },
  getBrandsDBUrl: function(version){
    return 'https://cdn.cliqz.com/brands-database/database/' + version + '/data/database.json';
  },
  getPref: function(pref, notFound){
    var mypref;
    if(mypref = CLIQZEnvironment.getLocalStorage().getItem(pref)) {
      return mypref;
    } else {
      return notFound;
    }
  },
  setPref: function(pref, val){
    CLIQZEnvironment.getLocalStorage().setItem(pref,val);
  },
  setInterval: function(){ return setInterval.apply(null, arguments); },
  setTimeout: function(){ return setTimeout.apply(null, arguments); },
  clearTimeout: function(){ clearTimeout.apply(null, arguments); },
  Promise: Promise,
  tldExtractor: function(host){
    //temp
    return host.split('.').splice(-1)[0];
  },
  getLocalStorage: function(url) {
    return CLIQZEnvironment.storage;
  },
  OS: 'chromium',
  isPrivate: function(){ return false; },
  isOnPrivateTab: function(win) { return false; },
  getWindow: function(){ return { document: { getElementById() {} } } },
  XMLHttpRequest: XMLHttpRequest,
  httpHandler: function(method, url, callback, onerror, timeout, data, sync) {
    var req = new CLIQZEnvironment.XMLHttpRequest();
    req.open(method, url, !sync)
    req.overrideMimeType && req.overrideMimeType('application/json');
    req.onload = function(){
      var statusClass = parseInt(req.status / 100);
      if(statusClass === 2 || statusClass === 3 || statusClass === 0 /* local files */){
        callback && callback(req);
      } else {
        onerror && onerror();
      }
    };
    req.onerror = function(){
      onerror && onerror();
    };

    req.ontimeout = function(){
      onerror && onerror();
    };

    if(callback && !sync){
      if(timeout){
        req.timeout = parseInt(timeout);
      } else {
        req.timeout = (method === 'POST'? 10000 : 1000);
      }
    }

    req.send(data);
    return req;
  },
  _pendingHistoryQueries: {},  // Will hold query-callback pairs.
  historySearch: function(q, callback, searchParam, sessionStart) {
      CLIQZEnvironment._pendingHistoryQueries[q] = callback;
      chrome.send("queryHistory", [q]);
  },
  getSearchEngines: function(){
    return ENGINES.map(function(e){
      e.getSubmissionForQuery = function(q){
          //TODO: create the correct search URL
          return e.searchForm;
      }

      return e
    });
  },
  getEngineByAlias: function(alias) {
    return ENGINES.find(function (engine) { return engine.alias === alias; });
  },
  getEngineByName: function(name) {
    return ENGINES.find(function (engine) { return engine.name === name; });
  },
  getNoResults: function() {
    var engine = CLIQZEnvironment.getDefaultSearchEngine();
    var details = CliqzUtils.getDetailsFromUrl(engine.url);

    var engines = CLIQZEnvironment.getSearchEngines(),
        defaultName = engines[0].name;

    return CLIQZEnvironment.Result.cliqzExtra(
        {
            data:
            {
                template:'noResult',
                text_line1: CLIQZEnvironment.getLocalizedString('noResultTitle'),
                // forwarding the query to the default search engine is not handled by CLIQZ but by Firefox
                // we should take care of this specific case differently on alternative platforms
                text_line2: CLIQZEnvironment.getLocalizedString('noResultMessage', defaultName),
                "search_engines": engines.map(function(e){
                  e.style = CLIQZEnvironment.getLogoDetails(CLIQZEnvironment.getDetailsFromUrl(e.searchForm)).style;
                  e.text =  e.alias.slice(1);
                  return e
                }),
                //use local image in case of no internet connection
                "cliqz_logo": CLIQZEnvironment.SKIN_PATH + "img/cliqz.svg"
            },
            subType: JSON.stringify({empty:true})
        }
    )
  },
  setDefaultSearchEngine: function(engine) {
    CLIQZEnvironment.getLocalStorage().setObject('defaultSearchEngine', engine);
  },
  getDefaultSearchEngine: function() {
    return CLIQZEnvironment.GOOGLE_ENGINE;
  },
  onRenderComplete: function(query, urls){
    chrome.send("renderComplete", [query, urls]);
  }
};

if (typeof KeyEvent == "undefined") {
    var KeyEvent = {
        DOM_VK_CANCEL: 3,
        DOM_VK_HELP: 6,
        DOM_VK_BACK_SPACE: 8,
        DOM_VK_TAB: 9,
        DOM_VK_CLEAR: 12,
        DOM_VK_RETURN: 13,
        DOM_VK_ENTER: 14,
        DOM_VK_SHIFT: 16,
        DOM_VK_CONTROL: 17,
        DOM_VK_ALT: 18,
        DOM_VK_PAUSE: 19,
        DOM_VK_CAPS_LOCK: 20,
        DOM_VK_ESCAPE: 27,
        DOM_VK_SPACE: 32,
        DOM_VK_PAGE_UP: 33,
        DOM_VK_PAGE_DOWN: 34,
        DOM_VK_END: 35,
        DOM_VK_HOME: 36,
        DOM_VK_LEFT: 37,
        DOM_VK_UP: 38,
        DOM_VK_RIGHT: 39,
        DOM_VK_DOWN: 40,
        DOM_VK_PRINTSCREEN: 44,
        DOM_VK_INSERT: 45,
        DOM_VK_DELETE: 46,
        DOM_VK_0: 48,
        DOM_VK_1: 49,
        DOM_VK_2: 50,
        DOM_VK_3: 51,
        DOM_VK_4: 52,
        DOM_VK_5: 53,
        DOM_VK_6: 54,
        DOM_VK_7: 55,
        DOM_VK_8: 56,
        DOM_VK_9: 57,
        DOM_VK_SEMICOLON: 59,
        DOM_VK_EQUALS: 61,
        DOM_VK_A: 65,
        DOM_VK_B: 66,
        DOM_VK_C: 67,
        DOM_VK_D: 68,
        DOM_VK_E: 69,
        DOM_VK_F: 70,
        DOM_VK_G: 71,
        DOM_VK_H: 72,
        DOM_VK_I: 73,
        DOM_VK_J: 74,
        DOM_VK_K: 75,
        DOM_VK_L: 76,
        DOM_VK_M: 77,
        DOM_VK_N: 78,
        DOM_VK_O: 79,
        DOM_VK_P: 80,
        DOM_VK_Q: 81,
        DOM_VK_R: 82,
        DOM_VK_S: 83,
        DOM_VK_T: 84,
        DOM_VK_U: 85,
        DOM_VK_V: 86,
        DOM_VK_W: 87,
        DOM_VK_X: 88,
        DOM_VK_Y: 89,
        DOM_VK_Z: 90,
        DOM_VK_CONTEXT_MENU: 93,
        DOM_VK_NUMPAD0: 96,
        DOM_VK_NUMPAD1: 97,
        DOM_VK_NUMPAD2: 98,
        DOM_VK_NUMPAD3: 99,
        DOM_VK_NUMPAD4: 100,
        DOM_VK_NUMPAD5: 101,
        DOM_VK_NUMPAD6: 102,
        DOM_VK_NUMPAD7: 103,
        DOM_VK_NUMPAD8: 104,
        DOM_VK_NUMPAD9: 105,
        DOM_VK_MULTIPLY: 106,
        DOM_VK_ADD: 107,
        DOM_VK_SEPARATOR: 108,
        DOM_VK_SUBTRACT: 109,
        DOM_VK_DECIMAL: 110,
        DOM_VK_DIVIDE: 111,
        DOM_VK_F1: 112,
        DOM_VK_F2: 113,
        DOM_VK_F3: 114,
        DOM_VK_F4: 115,
        DOM_VK_F5: 116,
        DOM_VK_F6: 117,
        DOM_VK_F7: 118,
        DOM_VK_F8: 119,
        DOM_VK_F9: 120,
        DOM_VK_F10: 121,
        DOM_VK_F11: 122,
        DOM_VK_F12: 123,
        DOM_VK_F13: 124,
        DOM_VK_F14: 125,
        DOM_VK_F15: 126,
        DOM_VK_F16: 127,
        DOM_VK_F17: 128,
        DOM_VK_F18: 129,
        DOM_VK_F19: 130,
        DOM_VK_F20: 131,
        DOM_VK_F21: 132,
        DOM_VK_F22: 133,
        DOM_VK_F23: 134,
        DOM_VK_F24: 135,
        DOM_VK_NUM_LOCK: 144,
        DOM_VK_SCROLL_LOCK: 145,
        DOM_VK_COMMA: 188,
        DOM_VK_PERIOD: 190,
        DOM_VK_SLASH: 191,
        DOM_VK_BACK_QUOTE: 192,
        DOM_VK_OPEN_BRACKET: 219,
        DOM_VK_BACK_SLASH: 220,
        DOM_VK_CLOSE_BRACKET: 221,
        DOM_VK_QUOTE: 222,
        DOM_VK_META: 224
    };
}

export default CLIQZEnvironment;
