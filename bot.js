require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, {polling: true});

// USD/KRW 환율 가져오기
async function getUSDKRWRate() {
    try {
        // 업비트의 USDT/KRW 환율 사용
        const response = await axios.get('https://api.upbit.com/v1/ticker?markets=KRW-USDT');
        if (response.data && response.data.length > 0) {
            return parseFloat(response.data[0].trade_price);
        }
        // 기본값 (대략적인 환율)
        return 1350;
    } catch (error) {
        // 기본값 사용
        return 1350;
    }
}

// 코인 심볼 매핑 (사용자 편의를 위해)
const coinMap = {
    'BTC': 'BTC',
    'ETH': 'ETH', 
    'ADA': 'ADA',
    'SOL': 'SOL',
    'DOT': 'DOT',
    'MATIC': 'MATIC',
    'LINK': 'LINK',
    'UNI': 'UNI',
    'AVAX': 'AVAX',
    'ATOM': 'ATOM',
    'XRP': 'XRP',
    'DOGE': 'DOGE',
    'LTC': 'LTC',
    'BCH': 'BCH',
    'BONK': 'BONK',
    'SHIB': 'SHIB',
    'PEPE': 'PEPE',
    '비트코인': 'BTC',
    '이더리움': 'ETH',
    '에이다': 'ADA',
    '솔라나': 'SOL',
    '리플': 'XRP',
    '도지코인': 'DOGE',
    '라이트코인': 'LTC',
    '시바': 'SHIB',
    '봉크': 'BONK'
};

// 거래소별 상장 여부 확인 함수들
async function checkBinanceListing(symbol) {
    try {
        const response = await axios.get(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}USDT`);
        return { listed: true, pair: `${symbol}/USDT` };
    } catch (error) {
        return { listed: false };
    }
}

async function checkUpbitListing(symbol) {
    try {
        const response = await axios.get(`https://api.upbit.com/v1/ticker?markets=KRW-${symbol}`);
        if (response.data && response.data.length > 0) {
            return { listed: true, pair: `${symbol}/KRW` };
        }
        return { listed: false };
    } catch (error) {
        return { listed: false };
    }
}

async function checkBithumbListing(symbol) {
    try {
        const response = await axios.get(`https://api.bithumb.com/public/ticker/${symbol}_KRW`);
        if (response.data && response.data.status === "0000") {
            return { listed: true, pair: `${symbol}/KRW` };
        }
        return { listed: false };
    } catch (error) {
        return { listed: false };
    }
}

async function checkCoinbaseListing(symbol) {
    try {
        const response = await axios.get(`https://api.coinbase.com/v2/exchange-rates?currency=${symbol}`);
        if (response.data && response.data.data && response.data.data.rates.USD) {
            return { listed: true, pair: `${symbol}/USD` };
        }
        return { listed: false };
    } catch (error) {
        return { listed: false };
    }
}

// 바이낸스에서 코인 가격 가져오기
async function getBinancePrice(symbol, usdkrwRate = 1350) {
    try {
        const response = await axios.get(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}USDT`);
        const price = parseFloat(response.data.price);
        
        if (isNaN(price) || price === 0) {
            return { error: '바이낸스에서 해당 코인을 찾을 수 없습니다' };
        }
        
        // 가격이 매우 작은 경우 (0.001 미만) 더 많은 소수점 표시
        let formattedPrice;
        if (price < 0.001) {
            formattedPrice = price.toFixed(8);
        } else if (price < 1) {
            formattedPrice = price.toFixed(6);
        } else {
            formattedPrice = price.toLocaleString('ko-KR');
        }
        
        // USDT를 KRW로 환산
        const krwPrice = (price * usdkrwRate).toLocaleString('ko-KR');
        
        return {
            exchange: '바이낸스',
            price: `${formattedPrice} USDT (≈${krwPrice} KRW)`,
            currency: 'USDT/KRW'
        };
    } catch (error) {
        return { error: '바이낸스에서 해당 코인을 찾을 수 없습니다' };
    }
}

// 업비트에서 코인 가격 가져오기
async function getUpbitPrice(symbol) {
    try {
        const response = await axios.get(`https://api.upbit.com/v1/ticker?markets=KRW-${symbol}`);
        if (response.data && response.data.length > 0) {
            const price = parseFloat(response.data[0].trade_price);
            
            if (isNaN(price) || price === 0) {
                return { error: '업비트에서 해당 코인을 찾을 수 없습니다' };
            }
            
            return {
                exchange: '업비트',
                price: price.toLocaleString('ko-KR'),
                currency: 'KRW'
            };
        } else {
            return { error: '업비트에서 해당 코인을 찾을 수 없습니다' };
        }
    } catch (error) {
        return { error: '업비트에서 해당 코인을 찾을 수 없습니다' };
    }
}

// 빗썸에서 코인 가격 가져오기
async function getBithumbPrice(symbol) {
    try {
        const response = await axios.get(`https://api.bithumb.com/public/ticker/${symbol}_KRW`);
        if (response.data && response.data.status === "0000") {
            const price = parseFloat(response.data.data.closing_price);
            
            if (isNaN(price) || price === 0) {
                return { error: '빗썸에서 해당 코인을 찾을 수 없습니다' };
            }
            
            return {
                exchange: '빗썸',
                price: price.toLocaleString('ko-KR'),
                currency: 'KRW'
            };
        } else {
            return { error: '빗썸에서 해당 코인을 찾을 수 없습니다' };
        }
    } catch (error) {
        return { error: '빗썸에서 해당 코인을 찾을 수 없습니다' };
    }
}

// 코인베이스에서 코인 가격 가져오기
async function getCoinbasePrice(symbol, usdkrwRate = 1350) {
    try {
        const response = await axios.get(`https://api.coinbase.com/v2/exchange-rates?currency=${symbol}`);
        if (response.data && response.data.data && response.data.data.rates && response.data.data.rates.USD) {
            const price = parseFloat(response.data.data.rates.USD);
            
            if (isNaN(price) || price === 0) {
                return { error: '코인베이스에서 해당 코인을 찾을 수 없습니다' };
            }
            
            // 가격이 매우 작은 경우 (0.001 미만) 더 많은 소수점 표시
            let formattedPrice;
            if (price < 0.001) {
                formattedPrice = price.toFixed(8);
            } else if (price < 1) {
                formattedPrice = price.toFixed(6);
            } else {
                formattedPrice = price.toLocaleString('ko-KR');
            }
            
            // USD를 KRW로 환산
            const krwPrice = (price * usdkrwRate).toLocaleString('ko-KR');
            
            return {
                exchange: '코인베이스',
                price: `${formattedPrice} USD (≈${krwPrice} KRW)`,
                currency: 'USD/KRW'
            };
        } else {
            return { error: '코인베이스에서 해당 코인을 찾을 수 없습니다' };
        }
    } catch (error) {
        return { error: '코인베이스에서 해당 코인을 찾을 수 없습니다' };
    }
}

// /start 명령어 처리
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const welcomeMessage = `
🚀 암호화폐 시세 봇입니다!

📊 사용 가능한 명령어:
/btc - 비트코인 시세 (전체 거래소)
/시세 [코인명] - 특정 코인 시세
/가격 [코인명] - 특정 코인 시세
/어디 [코인명] - 코인 상장 거래소 확인
  예: /시세 ETH, /가격 ADA, /어디 DOGE

🏪 개별 거래소:
/binance [코인] - 바이낸스 시세
/upbit [코인] - 업비트 시세  
/coinbase [코인] - 코인베이스 시세

📖 /help - 자세한 도움말
/coins - 지원하는 코인 목록
    `;
    bot.sendMessage(chatId, welcomeMessage);
});

// /help 명령어 처리
bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    const helpMessage = `
📖 상세 사용법:

🔍 시세 조회:
/price BTC 또는 /시세 BTC 또는 /가격 BTC - 비트코인 시세 (모든 거래소)
/시세 ETH - 이더리움 시세
/가격 ADA - 에이다 시세

🏪 상장 거래소 확인:
/어디 BTC - 비트코인이 상장된 거래소들
/어디 ETH - 이더리움이 상장된 거래소들
/어디 DOGE - 도지코인이 상장된 거래소들

🏪 거래소별 조회:
/binance BTC - 바이낸스 비트코인
/upbit ETH - 업비트 이더리움
/coinbase SOL - 코인베이스 솔라나

💡 팁:
- 한국어도 가능해요: /price 비트코인, /어디 비트코인
- 대소문자 구분 안함: btc, BTC 모두 OK
- /coins 로 지원 코인 목록 확인

❓ 지원하는 거래소:
🟡 바이낸스 (글로벌)
🔵 업비트 (한국)  
🟢 빗썸 (한국)
🟠 코인베이스 (글로벌)
    `;
    bot.sendMessage(chatId, helpMessage);
});

// 지원하는 코인 목록
bot.onText(/\/coins/, (msg) => {
    const chatId = msg.chat.id;
    const coinList = `
💰 지원하는 주요 코인들:

🥇 메이저:
• BTC (비트코인)
• ETH (이더리움)
• XRP (리플)

🥈 알트코인:
• ADA (에이다/카르다노)
• SOL (솔라나)
• DOT (폴카닷)
• MATIC (폴리곤)
• LINK (체인링크)
• UNI (유니스왑)
• AVAX (아발란체)
• ATOM (코스모스)
• DOGE (도지코인)
• LTC (라이트코인)
• BCH (비트코인캐시)
• BONK (봉크)
• SHIB (시바이누)
• PEPE (페페)

📝 사용법:
/시세 [심볼] 또는 /가격 [심볼] 또는 /price [심볼]
/어디 [심볼] 또는 /어디 [한국어명]

예: /시세 BTC, /가격 이더리움, /어디 도지코인

💡 새로운 코인이 필요하시면 말씀해주세요!
    `;
    bot.sendMessage(chatId, coinList);
});

// /어디 [코인명] 명령어 처리 - 상장 거래소 확인
bot.onText(/\/어디 (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userInput = match[1].toUpperCase();
    
    // 코인 심볼 변환
    const symbol = coinMap[userInput] || userInput;
    
    if (!symbol) {
        bot.sendMessage(chatId, '❌ 지원하지 않는 코인입니다. /coins 로 지원 코인을 확인해주세요.');
        return;
    }
    
    // 로딩 메시지
    bot.sendMessage(chatId, `🔍 ${symbol} 상장 거래소를 확인하는 중...`);
    
    try {
        // 모든 거래소에서 상장 여부 확인
        const [binance, upbit, bithumb, coinbase] = await Promise.all([
            checkBinanceListing(symbol),
            checkUpbitListing(symbol),
            checkBithumbListing(symbol),
            checkCoinbaseListing(symbol)
        ]);
        
        let message = `🏪 ${symbol} 상장 거래소\n\n`;
        let listedExchanges = [];
        let notListedExchanges = [];
        
        if (binance.listed) {
            listedExchanges.push(`🟡 바이낸스 (${binance.pair})`);
        } else {
            notListedExchanges.push('🚫 바이낸스');
        }
        
        if (upbit.listed) {
            listedExchanges.push(`🔵 업비트 (${upbit.pair})`);
        } else {
            notListedExchanges.push('🚫 업비트');
        }
        
        if (bithumb.listed) {
            listedExchanges.push(`🟢 빗썸 (${bithumb.pair})`);
        } else {
            notListedExchanges.push('🚫 빗썸');
        }
        
        if (coinbase.listed) {
            listedExchanges.push(`🟠 코인베이스 (${coinbase.pair})`);
        } else {
            notListedExchanges.push('🚫 코인베이스');
        }
        
        if (listedExchanges.length > 0) {
            message += '✅ 상장된 거래소:\n';
            message += listedExchanges.join('\n') + '\n\n';
        }
        
        if (notListedExchanges.length > 0) {
            message += '❌ 상장되지 않은 거래소:\n';
            message += notListedExchanges.join('\n') + '\n\n';
        }
        
        // 상장된 거래소가 없는 경우
        if (listedExchanges.length === 0) {
            message = `❌ ${symbol} 코인이 지원하는 거래소에 상장되지 않았습니다.\n\n다른 코인을 확인해보시거나 /coins 로 지원 코인 목록을 확인해주세요.`;
        } else {
            message += `💡 /시세 ${symbol} 또는 /가격 ${symbol} 으로 시세를 확인할 수 있습니다.`;
        }
        
        bot.sendMessage(chatId, message);
    } catch (error) {
        bot.sendMessage(chatId, '❌ 거래소 정보를 확인하는데 오류가 발생했습니다.');
    }
});

// /price, /시세, /가격 [코인명] 명령어 처리
bot.onText(/\/(?:price|시세|가격) (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userInput = match[1].toUpperCase();
    
    // 코인 심볼 변환
    const symbol = coinMap[userInput] || userInput;
    
    if (!symbol) {
        bot.sendMessage(chatId, '❌ 지원하지 않는 코인입니다. /coins 로 지원 코인을 확인해주세요.');
        return;
    }
    
    // 로딩 메시지
    bot.sendMessage(chatId, `🔍 ${symbol} 시세 정보를 가져오는 중...`);
    
    try {
        // 환율 먼저 가져오기
        const usdkrwRate = await getUSDKRWRate();
        
        // 모든 거래소에서 동시에 데이터 가져오기
        const [binance, upbit, bithumb, coinbase] = await Promise.all([
            getBinancePrice(symbol, usdkrwRate),
            getUpbitPrice(symbol),
            getBithumbPrice(symbol),
            getCoinbasePrice(symbol, usdkrwRate)
        ]);
        
        let message = `💰 ${symbol} 시세 정보\n\n`;
        
        if (!binance.error) {
            message += `🟡 ${binance.exchange}: ${binance.price}\n`;
        }
        if (!upbit.error) {
            message += `🔵 ${upbit.exchange}: ${upbit.price} ${upbit.currency}\n`;
        }
        if (!bithumb.error) {
            message += `🟢 ${bithumb.exchange}: ${bithumb.price} ${bithumb.currency}\n`;
        }
        if (!coinbase.error) {
            message += `🟠 ${coinbase.exchange}: ${coinbase.price}\n`;
        }
        
        // 모든 거래소에서 오류가 발생한 경우
        if (binance.error && upbit.error && bithumb.error && coinbase.error) {
            message = `❌ ${symbol} 코인을 찾을 수 없습니다.\n\n💡 /어디 ${symbol} 으로 상장 거래소를 먼저 확인해보세요.\n\n지원하는 코인 목록: /coins`;
        } else {
            message += `\n💱 USD/KRW 환율: ${usdkrwRate.toLocaleString('ko-KR')}`;
            message += `\n📅 ${new Date().toLocaleString('ko-KR')} 기준`;
        }
        
        bot.sendMessage(chatId, message);
    } catch (error) {
        bot.sendMessage(chatId, '❌ 시세 정보를 가져오는데 오류가 발생했습니다.');
    }
});

// /btc 명령어 (기존 유지)
bot.onText(/\/btc$/, async (msg) => {
    const chatId = msg.chat.id;
    
    // 로딩 메시지
    bot.sendMessage(chatId, '🔍 비트코인 시세 정보를 가져오는 중...');
    
    try {
        // 환율 먼저 가져오기
        const usdkrwRate = await getUSDKRWRate();
        
        // 모든 거래소에서 동시에 데이터 가져오기
        const [binance, upbit, bithumb, coinbase] = await Promise.all([
            getBinancePrice('BTC', usdkrwRate),
            getUpbitPrice('BTC'),
            getBithumbPrice('BTC'),
            getCoinbasePrice('BTC', usdkrwRate)
        ]);
        
        let message = '₿ 비트코인 시세 정보\n\n';
        
        if (!binance.error) {
            message += `🟡 ${binance.exchange}: ${binance.price}\n`;
        }
        if (!upbit.error) {
            message += `🔵 ${upbit.exchange}: ${upbit.price} ${upbit.currency}\n`;
        }
        if (!bithumb.error) {
            message += `🟢 ${bithumb.exchange}: ${bithumb.price} ${bithumb.currency}\n`;
        }
        if (!coinbase.error) {
            message += `🟠 ${coinbase.exchange}: ${coinbase.price}\n`;
        }
        
        message += `\n💱 USD/KRW 환율: ${usdkrwRate.toLocaleString('ko-KR')}`;
        message += `\n📅 ${new Date().toLocaleString('ko-KR')} 기준`;
        
        bot.sendMessage(chatId, message);
    } catch (error) {
        bot.sendMessage(chatId, '❌ 시세 정보를 가져오는데 오류가 발생했습니다.');
    }
});

// 기본 메시지 처리
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    
    // 명령어가 아닌 일반 메시지에 대한 응답
    if (!text.startsWith('/')) {
        bot.sendMessage(chatId, `💡 명령어를 사용해주세요!

🔍 시세 조회: /시세 [코인명] 또는 /가격 [코인명]
🏪 상장 확인: /어디 [코인명]
📖 도움말: /help
💰 지원 코인: /coins`);
    }
});

// 봇 시작 메시지
console.log('🤖 암호화폐 시세 봇이 시작되었습니다...');
console.log('📊 지원 거래소: 바이낸스, 업비트, 빗썸, 코인베이스');
console.log('💰 지원 코인: BTC, ETH, ADA, SOL, DOT, MATIC, LINK, UNI, AVAX, ATOM, XRP, DOGE, LTC, BCH, BONK, SHIB, PEPE');
console.log('🆕 새 기능: /어디 [코인명] - 상장 거래소 확인');

// 에러 처리
bot.on('error', (error) => {
    console.log('봇 에러:', error);
});

bot.on('polling_error', (error) => {
    console.log('폴링 에러:', error);
});