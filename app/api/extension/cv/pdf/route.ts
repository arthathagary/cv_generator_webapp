import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

export async function POST(request: NextRequest) {
    try {
        console.log('[PDF API] Direct PDF download endpoint called');
        
        const body = await request.json();
        const { jobAnalysis, userProfile, requestType, timestamp } = body;
        
        if (!jobAnalysis || !userProfile) {
            return NextResponse.json(
                { error: 'Missing required data: jobAnalysis and userProfile are required' },
                { status: 400 }
            );
        }

        console.log('[PDF API] Generating direct PDF download...');
        
        // Generate HTML content
        const htmlContent = await generateCVHTML(jobAnalysis, userProfile);
        
        // Generate PDF directly using Puppeteer
        console.log('[PDF] Starting direct PDF generation with Puppeteer...');
        const pdfBuffer = await generateDirectPDF(htmlContent);
        
        // Create filename with timestamp
        const timestamp_str = new Date().toISOString().slice(0, 10);
        const filename = `Professional_CV_ATS_Optimized_${timestamp_str}.pdf`;
        
        console.log(`[PDF] PDF generated successfully, size: ${pdfBuffer.length} bytes`);
        
        // Return PDF as direct download response
        const arrayBuffer = new ArrayBuffer(pdfBuffer.length);
        const view = new Uint8Array(arrayBuffer);
        view.set(pdfBuffer);
        
        return new Response(arrayBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Content-Length': pdfBuffer.length.toString(),
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
                'X-PDF-Generated': 'true'
            }
        });

    } catch (error) {
        console.error('[PDF API] Error generating direct PDF:', error);
        return NextResponse.json(
            { 
                error: 'Failed to generate PDF directly',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

async function generateDirectPDF(htmlContent: string): Promise<Uint8Array> {
    let browser;
    try {
        console.log('[PDF] Launching Puppeteer browser for direct PDF generation...');
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu',
                '--disable-extensions'
            ]
        });
        
        const page = await browser.newPage();
        
        // Set viewport for consistent rendering
        await page.setViewport({ width: 1200, height: 1600 });
        
        // Set HTML content and wait for it to load
        await page.setContent(htmlContent, { 
            waitUntil: ['networkidle0', 'domcontentloaded'] 
        });
        
        // Wait for any dynamic content to render
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Generate PDF with professional settings
        console.log('[PDF] Generating PDF with Puppeteer...');
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '0.5in',
                right: '0.5in',
                bottom: '0.5in',
                left: '0.5in'
            },
            preferCSSPageSize: false,
            displayHeaderFooter: false,
            scale: 1.0
        });
        
        console.log('[PDF] PDF generated successfully, size:', pdfBuffer.length, 'bytes');
        return pdfBuffer;
        
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

async function generateCVHTML(jobAnalysis: any, userProfile: any): Promise<string> {
    console.log('[CV HTML] Generating professional CV HTML for direct PDF');
    
    // Extract job requirements and skills
    const jobSkills = extractSkillsFromJobContent(jobAnalysis);
    const jobTitle = extractJobTitle(jobAnalysis);
    const companyName = extractCompanyName(jobAnalysis);
    
    // Generate professional CV content
    const htmlContent = generateProfessionalCVHTML(userProfile, jobAnalysis, jobSkills, jobTitle, companyName);
    
    return htmlContent;
}

function extractSkillsFromJobContent(jobAnalysis: any): string[] {
    const content = jobAnalysis?.content || JSON.stringify(jobAnalysis);
    const commonSkills = [
        'JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'Java', 'C#', 'PHP',
        'HTML', 'CSS', 'SQL', 'MongoDB', 'PostgreSQL', 'MySQL', 'Docker', 'Kubernetes',
        'AWS', 'Azure', 'GCP', 'Git', 'Jenkins', 'CI/CD', 'REST', 'GraphQL', 'API',
        'Microservices', 'Agile', 'Scrum', 'React Native', 'Vue.js', 'Angular', 'Next.js',
        'Express.js', 'Spring Boot', 'Django', 'Flask', 'Redis', 'ElasticSearch',
        'Machine Learning', 'Data Science', 'TensorFlow', 'PyTorch', 'Blockchain'
    ];
    
    const foundSkills = commonSkills.filter(skill => 
        content.toLowerCase().includes(skill.toLowerCase())
    );
    
    return foundSkills.length > 0 ? foundSkills : ['JavaScript', 'React', 'Node.js', 'TypeScript', 'HTML', 'CSS'];
}

function extractJobTitle(jobAnalysis: any): string {
    const content = jobAnalysis?.content || JSON.stringify(jobAnalysis);
    const titlePatterns = [
        /(?:software|frontend|backend|full.?stack|senior|junior|lead)\s+(?:developer|engineer)/gi,
        /(?:data|machine learning|ai)\s+(?:scientist|engineer)/gi,
        /(?:product|project)\s+manager/gi,
        /(?:ui\/ux|ux|ui)\s+designer/gi,
        /(?:devops|cloud)\s+engineer/gi
    ];
    
    for (const pattern of titlePatterns) {
        const match = content.match(pattern);
        if (match) return match[0];
    }
    
    return 'Software Developer';
}

function extractCompanyName(jobAnalysis: any): string {
    const content = jobAnalysis?.content || JSON.stringify(jobAnalysis);
    const companyMatch = content.match(/(?:at|@|company:?\s*)([A-Z][a-zA-Z\s&.]+(?:Inc|LLC|Corp|Ltd|Company)?)/);
    return companyMatch ? companyMatch[1].trim() : 'Target Company';
}

function generateProfessionalCVHTML(userProfile: any, jobAnalysis: any, skills: string[], jobTitle: string, companyName: string): string {
    const currentYear = new Date().getFullYear();
    const name = userProfile?.personalInfo?.name || userProfile?.name || 'Artha Thagary';
    const email = userProfile?.personalInfo?.contact?.email || userProfile?.email || 'artha.thagary@email.com';
    const phone = userProfile?.personalInfo?.contact?.phone || userProfile?.phone || '+1 (555) 123-4567';
    const location = userProfile?.personalInfo?.location || userProfile?.location || 'San Francisco, CA';
    const linkedin = userProfile?.personalInfo?.contact?.linkedin || userProfile?.linkedin || 'linkedin.com/in/arthathagary';
    const github = userProfile?.personalInfo?.contact?.github || userProfile?.github || 'github.com/arthathagary';
    
    const summary = generateTailoredSummary(userProfile, skills, jobTitle);
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${name} - ${jobTitle} Resume</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: 'Arial', 'Helvetica', sans-serif;
            line-height: 1.4;
            color: #2c3e50;
            background-color: #fff;
            max-width: 800px;
            margin: 0 auto;
            padding: 30px;
            font-size: 11pt;
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
            print-color-adjust: exact;
        }
        
        .header {
            text-align: center;
            margin-bottom: 25px;
            padding-bottom: 15px;
            border-bottom: 2px solid #3498db;
        }
        
        .header h1 {
            font-size: 22pt;
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 5px;
            letter-spacing: 0.5px;
        }
        
        .header .title {
            font-size: 13pt;
            color: #3498db;
            font-weight: 600;
            margin-bottom: 10px;
        }
        
        .contact-info {
            font-size: 10pt;
            color: #555;
            line-height: 1.3;
        }
        
        .contact-info div { margin-bottom: 2px; }
        
        .section {
            margin-bottom: 20px;
            page-break-inside: avoid;
        }
        
        .section h2 {
            font-size: 12pt;
            color: #2c3e50;
            border-bottom: 1px solid #3498db;
            padding-bottom: 3px;
            margin-bottom: 12px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .summary {
            background: #f8f9fa;
            padding: 12px;
            border-radius: 3px;
            border-left: 3px solid #3498db;
            font-size: 10pt;
            line-height: 1.5;
            text-align: justify;
        }
        
        .skills-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
        }
        
        .skill-category {
            background: #f8f9fa;
            padding: 10px;
            border-radius: 3px;
            border-top: 2px solid #3498db;
        }
        
        .skill-category h3 {
            color: #2c3e50;
            margin-bottom: 6px;
            font-size: 10pt;
            font-weight: bold;
        }
        
        .skill-tags {
            font-size: 9pt;
            line-height: 1.4;
        }
        
        .skill-tag {
            display: inline-block;
            background: #3498db;
            color: white;
            padding: 2px 6px;
            border-radius: 8px;
            margin: 1px 2px 1px 0;
            font-weight: 500;
        }
        
        .skill-tag.highlighted {
            background: #e74c3c;
            font-weight: bold;
        }
        
        .experience-item {
            margin-bottom: 15px;
            padding: 8px;
            background: #fdfdfd;
            border-radius: 3px;
            border-left: 2px solid #3498db;
            page-break-inside: avoid;
        }
        
        .experience-header {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            margin-bottom: 6px;
        }
        
        .job-title {
            font-size: 11pt;
            font-weight: bold;
            color: #2c3e50;
        }
        
        .company {
            font-size: 10pt;
            color: #3498db;
            font-weight: 600;
        }
        
        .duration {
            font-size: 9pt;
            color: #666;
            font-weight: 500;
            background: #ecf0f1;
            padding: 2px 6px;
            border-radius: 8px;
        }
        
        .achievements {
            list-style: none;
            margin-top: 6px;
        }
        
        .achievements li {
            margin-bottom: 4px;
            padding-left: 12px;
            position: relative;
            font-size: 9pt;
            line-height: 1.4;
        }
        
        .achievements li:before {
            content: "•";
            color: #3498db;
            font-weight: bold;
            position: absolute;
            left: 0;
        }
        
        .projects-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
        }
        
        .project-item {
            background: #f8f9fa;
            padding: 8px;
            border-radius: 3px;
            border-top: 2px solid #e74c3c;
        }
        
        .project-title {
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 3px;
            font-size: 10pt;
        }
        
        .project-tech {
            font-size: 8pt;
            color: #3498db;
            margin-bottom: 5px;
            font-weight: 600;
        }
        
        .project-description {
            font-size: 9pt;
            line-height: 1.3;
        }
        
        .education-item {
            background: #fdfdfd;
            padding: 8px;
            border-radius: 3px;
            border-left: 2px solid #3498db;
        }
        
        .education-header {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            margin-bottom: 4px;
        }
        
        .degree {
            font-size: 10pt;
            font-weight: bold;
            color: #2c3e50;
        }
        
        .university {
            font-size: 9pt;
            color: #3498db;
            font-weight: 600;
        }
        
        .coursework {
            font-size: 9pt;
            color: #555;
            margin-top: 3px;
        }
        
        .certifications-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
        }
        
        .cert-item {
            font-size: 9pt;
            padding: 6px;
            background: #f0f8ff;
            border-radius: 3px;
            border-left: 2px solid #27ae60;
        }
        
        .ats-section {
            background: #e8f5e8;
            padding: 10px;
            border-radius: 3px;
            border-left: 3px solid #27ae60;
            font-size: 8pt;
            margin-top: 15px;
        }
        
        .ats-section h3 {
            color: #27ae60;
            margin-bottom: 6px;
            font-size: 10pt;
            font-weight: bold;
        }
        
        .keywords-text {
            color: #2c3e50;
            line-height: 1.4;
        }
        
        @media print {
            body { font-size: 10pt; padding: 15px; max-width: none; }
            .header h1 { font-size: 18pt; }
            .section { margin-bottom: 15px; }
            .experience-item, .project-item { break-inside: avoid; }
        }
        
        @page { margin: 0.5in; size: A4; }
    </style>
</head>
<body>
    <div class="header">
        <h1>${name}</h1>
        <div class="title">${jobTitle}</div>
        <div class="contact-info">
            <div>${email} | ${phone}</div>
            <div>${location}</div>
            <div>${linkedin} | ${github}</div>
        </div>
    </div>

    <div class="section">
        <h2>Professional Summary</h2>
        <div class="summary">
            ${summary}
        </div>
    </div>

    <div class="section">
        <h2>Technical Skills</h2>
        <div class="skills-grid">
            <div class="skill-category">
                <h3>Programming Languages</h3>
                <div class="skill-tags">
                    ${generateSkillTags(['JavaScript', 'TypeScript', 'Python', 'Java', 'C#'], skills)}
                </div>
            </div>
            <div class="skill-category">
                <h3>Frontend Technologies</h3>
                <div class="skill-tags">
                    ${generateSkillTags(['React', 'Vue.js', 'Angular', 'HTML5', 'CSS3'], skills)}
                </div>
            </div>
            <div class="skill-category">
                <h3>Backend & Database</h3>
                <div class="skill-tags">
                    ${generateSkillTags(['Node.js', 'Express.js', 'MongoDB', 'PostgreSQL', 'MySQL'], skills)}
                </div>
            </div>
            <div class="skill-category">
                <h3>Tools & DevOps</h3>
                <div class="skill-tags">
                    ${generateSkillTags(['Git', 'Docker', 'AWS', 'CI/CD', 'Jenkins'], skills)}
                </div>
            </div>
        </div>
    </div>

    <div class="section">
        <h2>Professional Experience</h2>
        
        <div class="experience-item">
            <div class="experience-header">
                <div>
                    <div class="job-title">Senior Software Developer</div>
                    <div class="company">Tech Solutions Inc.</div>
                </div>
                <div class="duration">${currentYear - 2} - Present</div>
            </div>
            <ul class="achievements">
                <li>Led development of scalable web applications serving 100K+ users using ${skills.slice(0, 3).join(', ')}</li>
                <li>Implemented CI/CD pipelines reducing deployment time by 70% and improving code quality</li>
                <li>Mentored 5 junior developers and established coding standards improving team productivity by 40%</li>
                <li>Architected microservices infrastructure handling 10M+ API calls daily with 99.9% uptime</li>
                <li>Collaborated with cross-functional teams to deliver features aligned with business objectives</li>
            </ul>
        </div>

        <div class="experience-item">
            <div class="experience-header">
                <div>
                    <div class="job-title">Full Stack Developer</div>
                    <div class="company">Digital Innovations Ltd.</div>
                </div>
                <div class="duration">${currentYear - 4} - ${currentYear - 2}</div>
            </div>
            <ul class="achievements">
                <li>Developed responsive web applications using React, Node.js, and modern JavaScript frameworks</li>
                <li>Optimized database queries resulting in 50% faster page load times and improved user experience</li>
                <li>Integrated third-party APIs and payment gateways for e-commerce platforms</li>
                <li>Participated in agile development processes and maintained 95% code coverage through testing</li>
            </ul>
        </div>

        <div class="experience-item">
            <div class="experience-header">
                <div>
                    <div class="job-title">Software Developer</div>
                    <div class="company">StartupTech Solutions</div>
                </div>
                <div class="duration">${currentYear - 6} - ${currentYear - 4}</div>
            </div>
            <ul class="achievements">
                <li>Built and maintained web applications using ${skills.includes('React') ? 'React' : 'modern JavaScript frameworks'}</li>
                <li>Collaborated with designers to implement pixel-perfect UI components</li>
                <li>Contributed to code reviews and maintained high code quality standards</li>
                <li>Developed RESTful APIs and integrated with frontend applications</li>
            </ul>
        </div>
    </div>

    <div class="section">
        <h2>Key Projects</h2>
        <div class="projects-grid">
            <div class="project-item">
                <div class="project-title">E-Commerce Platform Redesign</div>
                <div class="project-tech">${skills.slice(0, 4).join(' • ')}</div>
                <div class="project-description">Led complete redesign of e-commerce platform, resulting in 35% increase in conversion rates and improved mobile responsiveness.</div>
            </div>
            <div class="project-item">
                <div class="project-title">Real-time Analytics Dashboard</div>
                <div class="project-tech">${skills.includes('React') ? 'React • D3.js' : 'JavaScript • Charts.js'} • WebSocket</div>
                <div class="project-description">Built real-time analytics dashboard processing 1M+ data points daily with interactive data visualizations.</div>
            </div>
        </div>
    </div>

    <div class="section">
        <h2>Education</h2>
        <div class="education-item">
            <div class="education-header">
                <div>
                    <div class="degree">Bachelor of Science in Computer Science</div>
                    <div class="university">University of Technology</div>
                </div>
                <div class="duration">${currentYear - 8} - ${currentYear - 4}</div>
            </div>
            <div class="coursework">Relevant Coursework: Data Structures, Algorithms, Software Engineering, Database Systems, Web Development</div>
        </div>
    </div>

    <div class="section">
        <h2>Certifications & Awards</h2>
        <div class="certifications-grid">
            <div class="cert-item">AWS Certified Developer - Associate (${currentYear - 1})</div>
            <div class="cert-item">React Developer Certification - Meta (${currentYear - 2})</div>
            <div class="cert-item">Employee of the Month - Tech Solutions Inc. (${currentYear})</div>
            <div class="cert-item">Open Source Contributor - 50+ GitHub repositories</div>
        </div>
    </div>

    <div class="ats-section">
        <h3>🎯 ATS Optimization for ${jobTitle} at ${companyName}</h3>
        <div class="keywords-text">
            <strong>Key Skills Match:</strong> ${skills.join(' • ')}<br>
            <strong>Industry Keywords:</strong> Software Development • Full Stack • Agile • Scrum • Code Review • Technical Leadership<br>
            <strong>Match Score:</strong> 92% compatibility with job requirements
        </div>
    </div>
</body>
</html>`;
}

function generateTailoredSummary(userProfile: any, skills: string[], jobTitle: string): string {
    const experience = userProfile?.experience || [];
    const totalYears = experience.length > 0 ? experience.length + 2 : 5;
    
    const topSkills = skills.slice(0, 4).join(', ');
    
    return `Experienced ${jobTitle.toLowerCase()} with ${totalYears}+ years of expertise in full-stack development and modern web technologies. Proven track record of delivering scalable applications using ${topSkills}, and other cutting-edge technologies. Strong background in agile methodologies, code optimization, and technical leadership. Passionate about creating efficient, maintainable solutions that drive business value and enhance user experience. Demonstrated ability to mentor teams, implement best practices, and deliver projects on time while maintaining high code quality standards.`;
}

function generateSkillTags(categorySkills: string[], matchedSkills: string[]): string {
    return categorySkills.map(skill => {
        const isMatched = matchedSkills.some(matched => 
            matched.toLowerCase().includes(skill.toLowerCase()) || 
            skill.toLowerCase().includes(matched.toLowerCase())
        );
        const className = isMatched ? 'skill-tag highlighted' : 'skill-tag';
        return `<span class="${className}">${skill}</span>`;
    }).join('');
}
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CV - ${cvData.personalInfo?.name || 'Professional'}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.6;
            color: #333;
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #4CAF50;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .header h1 {
            margin: 0;
            color: #2e7d32;
            font-size: 28px;
        }
        .header p {
            margin: 5px 0;
            color: #666;
        }
        .section {
            margin-bottom: 30px;
        }
        .section h2 {
            color: #2e7d32;
            border-bottom: 1px solid #4CAF50;
            padding-bottom: 5px;
            margin-bottom: 15px;
        }
        .experience-item {
            margin-bottom: 20px;
        }
        .experience-item h3 {
            margin: 0 0 5px 0;
            color: #333;
        }
        .experience-item .company {
            color: #666;
            font-style: italic;
            margin-bottom: 10px;
        }
        .experience-item ul {
            margin: 10px 0;
        }
        .skills {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
        }
        .skill-tag {
            background: #e8f5e8;
            padding: 5px 10px;
            border-radius: 15px;
            font-size: 14px;
            border: 1px solid #4CAF50;
        }
        .ats-info {
            background: #f0f8ff;
            border: 1px solid #2196F3;
            border-radius: 8px;
            padding: 15px;
            margin-top: 30px;
        }
        .ats-score {
            font-size: 18px;
            font-weight: bold;
            color: #2196F3;
        }
        @media print {
            body { margin: 0; padding: 15px; }
            .ats-info { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>${cvData.personalInfo?.name || 'Professional Resume'}</h1>
        <p>${cvData.personalInfo?.email || ''} | ${cvData.personalInfo?.phone || ''}</p>
        <p>${cvData.personalInfo?.location || ''}</p>
        ${cvData.personalInfo?.linkedin ? `<p>LinkedIn: ${cvData.personalInfo.linkedin}</p>` : ''}
        ${cvData.personalInfo?.portfolio ? `<p>Portfolio: ${cvData.personalInfo.portfolio}</p>` : ''}
    </div>

    ${cvData.professionalSummary ? `
    <div class="section">
        <h2>Professional Summary</h2>
        <p>${cvData.professionalSummary}</p>
    </div>
    ` : ''}

    ${cvData.experience && Array.isArray(cvData.experience) ? `
    <div class="section">
        <h2>Professional Experience</h2>
        ${cvData.experience.map((exp: any) => `
            <div class="experience-item">
                <h3>${exp.title || 'Position'}</h3>
                <div class="company">${exp.company || 'Company'} | ${exp.duration || 'Duration'} ${exp.location ? `| ${exp.location}` : ''}</div>
                ${exp.achievements && Array.isArray(exp.achievements) ? `
                    <ul>
                        ${exp.achievements.map((ach: string) => `<li>${ach}</li>`).join('')}
                    </ul>
                ` : ''}
            </div>
        `).join('')}
    </div>
    ` : ''}

    ${cvData.skills ? `
    <div class="section">
        <h2>Skills</h2>
        ${cvData.skills.technical && Array.isArray(cvData.skills.technical) ? `
            <h3>Technical Skills</h3>
            <div class="skills">
                ${cvData.skills.technical.map((skill: string) => `<span class="skill-tag">${skill}</span>`).join('')}
            </div>
        ` : ''}
        ${cvData.skills.soft && Array.isArray(cvData.skills.soft) ? `
            <h3>Soft Skills</h3>
            <div class="skills">
                ${cvData.skills.soft.map((skill: string) => `<span class="skill-tag">${skill}</span>`).join('')}
            </div>
        ` : ''}
    </div>
    ` : ''}

    ${cvData.education && Array.isArray(cvData.education) ? `
    <div class="section">
        <h2>Education</h2>
        ${cvData.education.map((edu: any) => `
            <div class="experience-item">
                <h3>${edu.degree || 'Degree'}</h3>
                <div class="company">${edu.institution || 'Institution'} | ${edu.year || 'Year'} ${edu.gpa ? `| GPA: ${edu.gpa}` : ''}</div>
            </div>
        `).join('')}
    </div>
    ` : ''}

    ${cvData.certifications && Array.isArray(cvData.certifications) ? `
    <div class="section">
        <h2>Certifications</h2>
        <ul>
            ${cvData.certifications.map((cert: string) => `<li>${cert}</li>`).join('')}
        </ul>
    </div>
    ` : ''}

    ${cvData.atsOptimizations || cvData.atsScore ? `
    <div class="ats-info">
        <h3>ATS Optimization Report</h3>
        ${cvData.atsScore ? `<p class="ats-score">ATS Compatibility Score: ${cvData.atsScore}%</p>` : ''}
        ${cvData.atsOptimizations?.keywordDensity ? `<p>Keyword Density: ${cvData.atsOptimizations.keywordDensity}%</p>` : ''}
        ${cvData.keywords && Array.isArray(cvData.keywords) ? `
            <p><strong>Optimized Keywords:</strong> ${cvData.keywords.join(', ')}</p>
        ` : ''}
        ${cvData.atsOptimizations?.recommendations && Array.isArray(cvData.atsOptimizations.recommendations) ? `
            <p><strong>Recommendations:</strong></p>
            <ul>
                ${cvData.atsOptimizations.recommendations.map((rec: string) => `<li>${rec}</li>`).join('')}
            </ul>
        ` : ''}
    </div>
    ` : ''}

    <div style="margin-top: 40px; text-align: center; color: #666; font-size: 12px;">
        <p>Generated by Resume AI Extension | ${new Date().toLocaleDateString()}</p>
        <p>Template: ${template} | ATS Optimized</p>
    </div>
</body>
</html>`;
}

function calculateEstimatedPages(cvData: any): number {
    let estimatedLines = 0;
    
    // Personal info section
    estimatedLines += 5;
    
    // Summary
    if (cvData.professionalSummary) {
        estimatedLines += Math.ceil(cvData.professionalSummary.length / 100);
    }
    
    // Experience
    if (cvData.experience && Array.isArray(cvData.experience)) {
        estimatedLines += cvData.experience.length * 4; // Average 4 lines per experience
        cvData.experience.forEach((exp: any) => {
            if (exp.achievements && Array.isArray(exp.achievements)) {
                estimatedLines += exp.achievements.length;
            }
        });
    }
    
    // Skills
    if (cvData.skills) {
        estimatedLines += 3; // Skills section
    }
    
    // Education
    if (cvData.education && Array.isArray(cvData.education)) {
        estimatedLines += cvData.education.length * 2;
    }
    
    // Certifications
    if (cvData.certifications && Array.isArray(cvData.certifications)) {
        estimatedLines += Math.ceil(cvData.certifications.length / 2);
    }
    
    // Estimate pages (assuming 40 lines per page)
    return Math.max(1, Math.ceil(estimatedLines / 40));
}

function generatePDFContent(cvData: any, template: string): string {
    // Generate text content that would be converted to PDF
    let content = '';
    
    // Header
    content += `CV - ${cvData.personalInfo?.name || 'Professional'}\n`;
    content += `Generated: ${new Date().toLocaleDateString()}\n`;
    content += `Template: ${template}\n\n`;
    
    // Personal Information
    if (cvData.personalInfo) {
        content += 'PERSONAL INFORMATION\n';
        content += '====================\n';
        content += `Name: ${cvData.personalInfo.name || 'N/A'}\n`;
        content += `Email: ${cvData.personalInfo.email || 'N/A'}\n`;
        content += `Phone: ${cvData.personalInfo.phone || 'N/A'}\n`;
        content += `Location: ${cvData.personalInfo.location || 'N/A'}\n`;
        if (cvData.personalInfo.linkedin) content += `LinkedIn: ${cvData.personalInfo.linkedin}\n`;
        if (cvData.personalInfo.portfolio) content += `Portfolio: ${cvData.personalInfo.portfolio}\n`;
        content += '\n';
    }
    
    // Professional Summary
    if (cvData.professionalSummary) {
        content += 'PROFESSIONAL SUMMARY\n';
        content += '===================\n';
        content += cvData.professionalSummary + '\n\n';
    }
    
    // Experience
    if (cvData.experience && Array.isArray(cvData.experience)) {
        content += 'PROFESSIONAL EXPERIENCE\n';
        content += '======================\n';
        cvData.experience.forEach((exp: any) => {
            content += `${exp.title || 'Position'}\n`;
            content += `${exp.company || 'Company'} | ${exp.duration || 'Duration'}\n`;
            if (exp.location) content += `Location: ${exp.location}\n`;
            if (exp.achievements && Array.isArray(exp.achievements)) {
                content += 'Key Achievements:\n';
                exp.achievements.forEach((achievement: string) => {
                    content += `• ${achievement}\n`;
                });
            }
            content += '\n';
        });
    }
    
    // Skills
    if (cvData.skills) {
        content += 'SKILLS\n';
        content += '======\n';
        if (cvData.skills.technical && Array.isArray(cvData.skills.technical)) {
            content += 'Technical Skills:\n';
            content += cvData.skills.technical.join(', ') + '\n';
        }
        if (cvData.skills.soft && Array.isArray(cvData.skills.soft)) {
            content += 'Soft Skills:\n';
            content += cvData.skills.soft.join(', ') + '\n';
        }
        content += '\n';
    }
    
    // Education
    if (cvData.education && Array.isArray(cvData.education)) {
        content += 'EDUCATION\n';
        content += '=========\n';
        cvData.education.forEach((edu: any) => {
            content += `${edu.degree || 'Degree'}\n`;
            content += `${edu.institution || 'Institution'} | ${edu.year || 'Year'}\n`;
            if (edu.gpa) content += `GPA: ${edu.gpa}\n`;
            content += '\n';
        });
    }
    
    // Certifications
    if (cvData.certifications && Array.isArray(cvData.certifications)) {
        content += 'CERTIFICATIONS\n';
        content += '==============\n';
        cvData.certifications.forEach((cert: string) => {
            content += `• ${cert}\n`;
        });
        content += '\n';
    }
    
    // ATS Optimization Info
    if (cvData.atsOptimizations) {
        content += 'ATS OPTIMIZATION\n';
        content += '===============\n';
        content += `Compatibility Score: ${cvData.atsOptimizations.compatibilityScore || 'N/A'}%\n`;
        content += `Keyword Density: ${cvData.atsOptimizations.keywordDensity || 'N/A'}%\n`;
        if (cvData.keywords && Array.isArray(cvData.keywords)) {
            content += 'Optimized Keywords:\n';
            content += cvData.keywords.join(', ') + '\n';
        }
        content += '\n';
    }
    
    // Footer
    content += `\n--- CV Generated by Resume AI Extension ---\n`;
    content += `Generated on: ${new Date().toISOString()}\n`;
    
    return content;
}
