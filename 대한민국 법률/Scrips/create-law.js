const fs = require('fs');
const path = require('path');

// 대상 파일 목록 설정
const files = [
    {
        name: '약사법 법률',
        path: path.join(__dirname, '../legalize-kr/kr/약사법/법률.md'),
        type: 'law'
    },
    {
        name: '약사법 시행령',
        path: path.join(__dirname, '../legalize-kr/kr/약사법/시행령.md'),
        type: 'decree'
    },
    {
        name: '약사법 시행규칙',
        path: path.join(__dirname, '../legalize-kr/kr/약사법/시행규칙.md'),
        type: 'rule'
    },
    {
        name: '의약품등의 안전에 관한 규칙',
        path: path.join(__dirname, '../legalize-kr/kr/의약품등의안전에관한규칙/총리령.md'),
        type: 'safety_rule'
    },
    {
        name: '의약품 제조 및 품질관리에 관한 규정 (식약처 고시)',
        path: path.join(__dirname, '../admrule-kr/국무총리/식품의약품안전처/고시/의약품 제조 및 품질관리에 관한 규정/본문.md'),
        type: 'gmp_notice'
    }
];

// 조항 추출 정규식
// 제12조, 제38조의2, 제48조제1항, 제48조제5호가목 등 매칭
const articleRegexStr = '제\\d+조(?:의\\d+)?(?:제\\d+항)?(?:제\\d+호)?(?:[가-힣]목)?';

// 텍스트 변환 핵심 함수
function convertLinks(content, fileType) {
    const linkTokens = [];
    let tokenIndex = 0;

    // 1. 기존의 [[링크]] 패턴을 임시 토큰으로 치환하여 보호 (중복 링크 방지)
    let processedContent = content.replace(/\[\[([^\]]+)\]\]/g, (match, p1) => {
        const token = `__LINK_TOKEN_${tokenIndex++}__`;
        linkTokens.push({ token, original: match });
        return token;
    });

    // 2. 파일 타입별 상호 참조 링크 생성
    if (fileType === 'law') {
        // 법률 문서 내
        // 시행령 제X조 / 영 제X조 -> [[시행령#제X조|영 제X조]]
        processedContent = processedContent.replace(new RegExp(`(?:시행령|영)\\s+(${articleRegexStr})`, 'g'), '[[시행령#$1|영 $1]]');
        // 시행규칙 제X조 / 규칙 제X조 -> [[시행규칙#제X조|규칙 제X조]]
        processedContent = processedContent.replace(new RegExp(`(?:시행규칙|규칙)\\s+(${articleRegexStr})`, 'g'), '[[시행규칙#$1|규칙 $1]]');
        // 자기 자신 제X조 -> [[#제X조|제X조]]
        processedContent = processedContent.replace(new RegExp(`(?<![#\\|])\\b(${articleRegexStr})`, 'g'), '[[#$1|$1]]');

    } else if (fileType === 'decree') {
        // 시행령 문서 내
        // 법 제X조 -> [[법률#제X조|법 제X조]]
        processedContent = processedContent.replace(new RegExp(`법\\s+(${articleRegexStr})`, 'g'), '[[법률#$1|법 $1]]');
        // 시행규칙 제X조 / 규칙 제X조 -> [[시행규칙#제X조|규칙 제X조]]
        processedContent = processedContent.replace(new RegExp(`(?:시행규칙|규칙)\\s+(${articleRegexStr})`, 'g'), '[[시행규칙#$1|규칙 $1]]');
        // 자기 자신 제X조 -> [[#제X조|제X조]]
        processedContent = processedContent.replace(new RegExp(`(?<![#\\|])\\b(${articleRegexStr})`, 'g'), '[[#$1|$1]]');

    } else if (fileType === 'rule') {
        // 시행규칙 문서 내
        // 법 제X조 -> [[법률#제X조|법 제X조]]
        processedContent = processedContent.replace(new RegExp(`법\\s+(${articleRegexStr})`, 'g'), '[[법률#$1|법 $1]]');
        // 시행령 제X조 / 영 제X조 -> [[시행령#제X조|영 제X조]]
        processedContent = processedContent.replace(new RegExp(`(?:시행령|영)\\s+(${articleRegexStr})`, 'g'), '[[시행령#$1|영 $1]]');
        // 자기 자신 제X조 -> [[#제X조|제X조]]
        processedContent = processedContent.replace(new RegExp(`(?<![#\\|])\\b(${articleRegexStr})`, 'g'), '[[#$1|$1]]');

    } else if (fileType === 'safety_rule') {
        // 의약품등의 안전에 관한 규칙 (총리령) 내
        // 법 제X조 -> [[법률#제X조|법 제X조]]
        processedContent = processedContent.replace(new RegExp(`법\\s+(${articleRegexStr})`, 'g'), '[[법률#$1|법 $1]]');
        // 자기 자신 제X조 -> [[#제X조|제X조]]
        processedContent = processedContent.replace(new RegExp(`(?<![#\\|])\\b(${articleRegexStr})`, 'g'), '[[#$1|$1]]');
        // 별표 X -> [[#별표 X|별표 X]]
        processedContent = processedContent.replace(/(?<![#\|])(별표\s*\d+(?:의\d+)?)/g, '[[#$1|$1]]');

    } else if (fileType === 'gmp_notice') {
        // 의약품 제조 및 품질관리에 관한 규정 (식약처 고시) 내
        // 약사법 제X조 -> [[법률#제X조|약사법 제X조]]
        processedContent = processedContent.replace(new RegExp(`약사법\\s+(${articleRegexStr})`, 'g'), '[[법률#$1|약사법 $1]]');
        // 규칙 제X조 -> [[총리령#제X조|규칙 제X조]]
        processedContent = processedContent.replace(new RegExp(`규칙\\s+(${articleRegexStr})`, 'g'), '[[총리령#$1|규칙 $1]]');
        // 자기 자신 제X조 -> [[#제X조|제X조]]
        processedContent = processedContent.replace(new RegExp(`(?<![#\\|])\\b(${articleRegexStr})`, 'g'), '[[#$1|$1]]');
    }

    // 3. 임시 토큰을 다시 원래 [[링크]]로 복원
    for (let i = linkTokens.length - 1; i >= 0; i--) {
        const { token, original } = linkTokens[i];
        processedContent = processedContent.replace(token, original);
    }

    return processedContent;
}

// 스크립트 실행 메인 로직
console.log('법령 상호 참조 위키링크 변환 시작...');

files.forEach(file => {
    if (!fs.existsSync(file.path)) {
        console.warn(`파일을 찾을 수 없습니다: ${file.path}`);
        return;
    }

    try {
        // 백업 파일 생성
        const backupPath = `${file.path}.bak`;
        fs.copyFileSync(file.path, backupPath);
        console.log(`[백업 완료] ${file.name} -> ${path.basename(backupPath)}`);

        // 원본 파일 읽기
        const content = fs.readFileSync(file.path, 'utf8');

        // 변환 수행
        const converted = convertLinks(content, file.type);

        // 변경 사항 저장
        fs.writeFileSync(file.path, converted, 'utf8');
        console.log(`[변환 완료] ${file.name} 파일 업데이트 완료.`);

    } catch (error) {
        console.error(`[오류 발생] ${file.name} 처리 중 오류:`, error);
    }
});

console.log('모든 작업이 완료되었습니다.');
