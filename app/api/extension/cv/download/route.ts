import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../lib/auth';
import clientPromise from '../../../../../lib/mongodb';

export async function POST(request: NextRequest) {
    try {
        console.log('[PDF DOWNLOAD API] Direct PDF download endpoint called');
        
        // Verify authentication
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }
        
        const body = await request.json();
        const { jobAnalysis, requestType, timestamp } = body;
        
        if (!jobAnalysis) {
            return NextResponse.json(
                { error: 'Missing required data: jobAnalysis is required' },
                { status: 400 }
            );
        }

        // Get user profile from database instead of trusting client data
        const client = await clientPromise;
        const profiles = client.db().collection('profiles');
        const userProfile = await profiles.findOne({ 
            userId: (session.user as any).id 
        });

        if (!userProfile) {
            return NextResponse.json({ 
                error: 'User profile not found. Please complete your profile first.' 
            }, { status: 404 });
        }

        console.log(`[PDF] Generating CV for authenticated user: ${userProfile.personalInfo?.fullName || session.user.email}`);
        console.log('[PDF DOWNLOAD API] Generating direct PDF download...');
        
        // Generate HTML content with authenticated user's actual profile
        const htmlContent = await generateCVHTML(jobAnalysis, userProfile);
        
        // Generate PDF directly using Puppeteer
        console.log('[PDF] Starting direct PDF generation with Puppeteer...');
        const pdfBuffer = await generateDirectPDF(htmlContent);
        
        // Create filename with user name and timestamp
        const userName = userProfile.personalInfo?.fullName?.replace(/\s+/g, '_') || 'User';
        const timestamp_str = new Date().toISOString().slice(0, 10);
        const filename = `${userName}_CV_ATS_Optimized_${timestamp_str}.pdf`;
        
        console.log(`[PDF] PDF generated successfully for ${userName}, size: ${pdfBuffer.length} bytes`);
        
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
        console.error('[PDF DOWNLOAD API] Error generating direct PDF:', error);
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
    const htmlContent = await generateProfessionalCVHTML(userProfile, jobAnalysis, jobSkills, jobTitle, companyName);
    
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

async function generateProfessionalCVHTML(userProfile: any, jobAnalysis: any, skills: string[], jobTitle: string, companyName: string): Promise<string> {
    const currentYear = new Date().getFullYear();
    
    // Extract user's actual profile data using correct structure
    const personalInfo = userProfile?.personalInfo || {};
    const name = personalInfo?.fullName || userProfile?.name || 'Professional Name';
    const email = personalInfo?.email || userProfile?.email || 'email@example.com';
    const phone = personalInfo?.phone || userProfile?.phone || '';
    const location = personalInfo?.location || userProfile?.location || '';
    const linkedin = personalInfo?.linkedin || userProfile?.linkedin || '';
    const website = personalInfo?.website || userProfile?.website || '';
    const summary = personalInfo?.summary || userProfile?.summary || '';
    
    // Extract user's skills properly
    const userSkills = userProfile?.skills || {};
    const technicalSkills = userSkills?.technical || [];
    const softSkills = userSkills?.soft || [];
    const languages = userSkills?.languages || [];
    
    // Generate job-tailored summary and match skills with job requirements
    const tailoredSummary = await generateJobMatchedSummary(userProfile, jobAnalysis, jobTitle, companyName);
    const matchedSkills = matchSkillsWithJobRequirements(technicalSkills, softSkills, jobAnalysis, skills);
    const atsKeywords = extractATSKeywords(jobAnalysis, matchedSkills);
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${name} - ${jobTitle} Resume</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: 'Times New Roman', Times, serif;
            line-height: 1.4;
            color: #000000;
            background-color: #ffffff;
            max-width: 8.5in;
            margin: 0 auto;
            padding: 0.5in;
            font-size: 11pt;
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
            print-color-adjust: exact;
        }
        
        .header {
            text-align: center;
            margin-bottom: 15px;
            padding-bottom: 8px;
            border-bottom: 1px solid #000000;
        }
        
        .header h1 {
            font-size: 16pt;
            font-weight: bold;
            color: #000000;
            margin-bottom: 5px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .header .title {
            font-size: 12pt;
            color: #000000;
            font-weight: normal;
            margin-bottom: 5px;
        }
        
        .contact-info {
            font-size: 10pt;
            color: #000000;
            line-height: 1.2;
        }
        
        .contact-info div { margin-bottom: 1px; }
        
        .section {
            margin-bottom: 12px;
            page-break-inside: avoid;
        }
        
        .section h2 {
            font-size: 11pt;
            color: #000000;
            border-bottom: 1px solid #000000;
            padding-bottom: 1px;
            margin-bottom: 8px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .summary {
            font-size: 10pt;
            line-height: 1.3;
            text-align: justify;
            margin-bottom: 3px;
        }
        
        .skills-section {
            margin-bottom: 10px;
        }
        
        .skills-category {
            margin-bottom: 5px;
        }
        
        .skills-category h3 {
            color: #000000;
            margin-bottom: 2px;
            font-size: 10pt;
            font-weight: bold;
        }
        
        .skills-list {
            font-size: 10pt;
            line-height: 1.2;
        }
        
        .experience-item {
            margin-bottom: 10px;
            page-break-inside: avoid;
        }
        
        .experience-header {
            margin-bottom: 3px;
        }
        
        .job-title {
            font-size: 11pt;
            font-weight: bold;
            color: #000000;
            display: inline;
        }
        
        .company {
            font-size: 11pt;
            color: #000000;
            font-weight: normal;
            display: inline;
        }
        
        .duration {
            font-size: 10pt;
            color: #000000;
            font-weight: normal;
            float: right;
        }
        
        .clear { clear: both; }
        
        .achievements {
            list-style: none;
            margin-top: 3px;
            margin-left: 0;
        }
        
        .achievements li {
            margin-bottom: 2px;
            padding-left: 12px;
            position: relative;
            font-size: 10pt;
            line-height: 1.2;
        }
        
        .achievements li:before {
            content: "•";
            color: #000000;
            font-weight: bold;
            position: absolute;
            left: 0;
        }
        
        .education-item {
            margin-bottom: 6px;
        }
        
        .education-header {
            margin-bottom: 2px;
        }
        
        .degree {
            font-size: 11pt;
            font-weight: bold;
            color: #000000;
            display: inline;
        }
        
        .university {
            font-size: 11pt;
            color: #000000;
            font-weight: normal;
            display: inline;
        }
        
        .education-duration {
            font-size: 10pt;
            color: #000000;
            font-weight: normal;
            float: right;
        }
        
        .coursework {
            font-size: 10pt;
            color: #000000;
            margin-top: 1px;
            font-style: italic;
        }
        
        .certifications-list {
            list-style: none;
            margin-left: 0;
        }
        
        .certifications-list li {
            font-size: 10pt;
            margin-bottom: 2px;
            padding-left: 12px;
            position: relative;
        }
        
        .certifications-list li:before {
            content: "•";
            color: #000000;
            font-weight: bold;
            position: absolute;
            left: 0;
        }
        
        .projects-section {
            margin-bottom: 10px;
        }
        
        .project-item {
            margin-bottom: 8px;
        }
        
        .project-title {
            font-weight: bold;
            color: #000000;
            margin-bottom: 1px;
            font-size: 10pt;
        }
        
        .project-tech {
            font-size: 9pt;
            color: #000000;
            margin-bottom: 2px;
            font-style: italic;
        }
        
        .project-description {
            font-size: 10pt;
            line-height: 1.2;
        }
        
        .keywords-section {
            margin-top: 15px;
            padding-top: 8px;
            border-top: 1px solid #000000;
        }
        
        .keywords-section h3 {
            color: #000000;
            margin-bottom: 3px;
            font-size: 10pt;
            font-weight: bold;
        }
        
        .keywords-text {
            color: #000000;
            line-height: 1.2;
            font-size: 9pt;
        }
        
        @media print {
            body { 
                font-size: 10pt; 
                padding: 0.4in; 
                max-width: none; 
            }
            .header h1 { font-size: 14pt; }
            .section { margin-bottom: 10px; }
            .experience-item, .project-item { break-inside: avoid; }
        }
        
        @page { 
            margin: 0.5in; 
            size: 8.5in 11in; 
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>${name}</h1>
        <div class="title">${jobTitle}</div>
        <div class="contact-info">
            <div>${[email, phone, location].filter(item => item && item.trim()).join(' | ')}</div>
            ${linkedin || website ? `<div>${[linkedin, website].filter(item => item && item.trim()).join(' | ')}</div>` : ''}
        </div>
    </div>

    <div class="section">
        <h2>Professional Summary</h2>
        <div class="summary">
            ${tailoredSummary}
        </div>
    </div>

    <div class="section">
        <h2>Technical Skills</h2>
        <div class="skills-section">
            <div class="skills-category">
                <h3>Core Technologies:</h3>
                <div class="skills-list">${matchedSkills.technical.slice(0, 10).join(', ')}</div>
            </div>
            <div class="skills-category">
                <h3>Professional Competencies:</h3>
                <div class="skills-list">${matchedSkills.soft.join(', ')}</div>
            </div>
        </div>
    </div>

    <div class="section">
        <h2>Professional Experience</h2>
        ${generateExperienceSection(userProfile, matchedSkills.technical, jobAnalysis, jobTitle)}
    </div>

    ${generateProjectsSection(userProfile, matchedSkills.technical, jobAnalysis, jobTitle) ? `
    <div class="section">
        <h2>Key Projects</h2>
        ${generateProjectsSection(userProfile, matchedSkills.technical, jobAnalysis, jobTitle)}
    </div>
    ` : ''}

    ${generateEducationSection(userProfile, jobAnalysis) ? `
    <div class="section">
        <h2>Education</h2>
        ${generateEducationSection(userProfile, jobAnalysis)}
    </div>
    ` : ''}

    ${generateCertificationsSection(userProfile, jobAnalysis) ? `
    <div class="section">
        <h2>Certifications</h2>
        ${generateCertificationsSection(userProfile, jobAnalysis)}
    </div>
    ` : ''}

</body>
</html>`;
}

function generateExperienceSection(userProfile: any, relevantSkills: string[], jobAnalysis: any = null, targetJobTitle: string = ''): string {
    const experience = userProfile?.experience || [];
    
    if (experience.length === 0) {
        // Fallback to sample experience if no user data
        const currentYear = new Date().getFullYear();
        return `
        <div class="experience-item">
            <div class="experience-header">
                <span class="job-title">Software Developer</span> - <span class="company">Technology Company</span>
                <span class="duration">${currentYear - 2} - Present</span>
                <div class="clear"></div>
            </div>
            <ul class="achievements">
                <li>Developed scalable web applications using ${relevantSkills.slice(0, 3).join(', ')} with focus on performance optimization</li>
                <li>Collaborated with cross-functional teams to deliver high-quality software solutions meeting business requirements</li>
                <li>Implemented responsive design principles and modern development practices for enhanced user experience</li>
                <li>Participated in code reviews and maintained coding standards ensuring optimal application performance</li>
            </ul>
        </div>`;
    }
    
    return experience.map((job: any) => {
        const startDate = job.startDate ? formatDate(job.startDate) : 'Unknown';
        const endDate = job.endDate ? formatDate(job.endDate) : (job.isCurrent ? 'Present' : 'Unknown');
        const duration = `${startDate} - ${endDate}`;
        
        // Use actual achievements but enhance them with job-relevant keywords
        const achievements = job.achievements && job.achievements.length > 0 
            ? job.achievements.map((achievement: string) => enhanceAchievementWithJobContext(achievement, relevantSkills, jobAnalysis))
            : generateContextualAchievements(job, relevantSkills, jobAnalysis, targetJobTitle);
            
        return `
        <div class="experience-item">
            <div class="experience-header">
                <span class="job-title">${job.title || 'Software Developer'}</span> - <span class="company">${job.company || 'Company'}</span>
                <span class="duration">${duration}</span>
                <div class="clear"></div>
            </div>
            <ul class="achievements">
                ${achievements.map((achievement: string) => `<li>${achievement}</li>`).join('')}
            </ul>
        </div>`;
    }).join('');
}

function enhanceAchievementWithJobContext(achievement: string, relevantSkills: string[], jobAnalysis: any): string {
    let enhanced = achievement;
    const jobContent = jobAnalysis?.content?.toLowerCase() || '';
    
    // Add relevant technical skills naturally if not already present
    const techSkillsToAdd = relevantSkills.filter(skill => 
        !enhanced.toLowerCase().includes(skill.toLowerCase()) &&
        jobContent.includes(skill.toLowerCase())
    ).slice(0, 2);
    
    if (techSkillsToAdd.length > 0) {
        // Naturally integrate skills into the achievement
        if (enhanced.toLowerCase().includes('using') || enhanced.toLowerCase().includes('with')) {
            enhanced = enhanced.replace(/using \w+/i, `using ${techSkillsToAdd.join(', ')}`);
        } else if (enhanced.toLowerCase().includes('develop') || enhanced.toLowerCase().includes('build')) {
            enhanced = enhanced.replace(/develop(\w+)?|build(\w+)?/i, `$&ed using ${techSkillsToAdd.join(' and ')}`);
        } else {
            enhanced = `${enhanced} utilizing ${techSkillsToAdd.join(' and ')} technologies`;
        }
    }
    
    // Add business impact if not present and job mentions performance/results
    if (!enhanced.match(/\d+%|\dx|improvement|increased|reduced/) && 
        (jobContent.includes('performance') || jobContent.includes('optimization') || jobContent.includes('efficiency'))) {
        const metrics = ['25%', '30%', '40%', '50%'];
        const randomMetric = metrics[Math.floor(Math.random() * metrics.length)];
        enhanced = `${enhanced}, resulting in ${randomMetric} improvement in system performance`;
    }
    
    return enhanced;
}

function generateContextualAchievements(job: any, relevantSkills: string[], jobAnalysis: any, targetJobTitle: string): string[] {
    const jobContent = jobAnalysis?.content?.toLowerCase() || '';
    const userJobTitle = (job.title || 'developer').toLowerCase();
    const company = job.company || 'the company';
    
    // Base achievements that naturally incorporate relevant skills
    const achievements = [
        `Developed and maintained scalable applications using ${relevantSkills.slice(0, 3).join(', ')} resulting in enhanced system reliability and performance`,
        `Collaborated with cross-functional teams including designers, product managers, and QA engineers to deliver high-quality software solutions`,
    ];
    
    // Add role-specific achievements with natural keyword integration
    if (userJobTitle.includes('senior') || userJobTitle.includes('lead') || targetJobTitle.toLowerCase().includes('senior')) {
        achievements.push(`Led technical initiatives and mentored junior developers while establishing coding standards and best practices`);
        if (jobContent.includes('architecture') || jobContent.includes('design')) {
            achievements.push(`Contributed to system architecture decisions and technical design reviews for optimal scalability and maintainability`);
        }
    }
    
    // Add job-specific technical achievements
    if (jobContent.includes('api') || jobContent.includes('backend')) {
        achievements.push(`Designed and implemented RESTful APIs and backend services ensuring robust data management and integration capabilities`);
    }
    
    if (jobContent.includes('frontend') || jobContent.includes('ui') || jobContent.includes('user')) {
        achievements.push(`Built responsive user interfaces and enhanced user experience through modern frontend development practices and usability testing`);
    }
    
    if (jobContent.includes('database') || jobContent.includes('sql')) {
        achievements.push(`Optimized database queries and data structures improving application response times and overall system efficiency`);
    }
    
    if (jobContent.includes('testing') || jobContent.includes('quality')) {
        achievements.push(`Implemented comprehensive testing strategies including unit tests and integration tests ensuring code quality and reliability`);
    }
    
    // Add agile/methodology achievement if mentioned in job
    if (jobContent.includes('agile') || jobContent.includes('scrum') || jobContent.includes('sprint')) {
        achievements.push(`Participated in agile development processes including sprint planning, daily standups, and retrospectives for continuous improvement`);
    }
    
    return achievements.slice(0, 4); // Limit to 4 achievements per job
}

function generateProjectsSection(userProfile: any, relevantSkills: string[], jobAnalysis: any = null, targetJobTitle: string = ''): string | null {
    const projects = userProfile?.projects || [];
    
    // Enhanced project description function with ATS keywords
    function enhanceProjectDescription(project: any, relevantSkills: string[], jobAnalysis: any): string {
        const baseDescription = project.description || '';
        
        if (!jobAnalysis || !baseDescription) {
            return baseDescription || `Developed and implemented a comprehensive solution using modern technologies and best practices for optimal performance and user experience.`;
        }
        
        // Extract relevant keywords from job analysis
        const jobSkills = jobAnalysis.skills || [];
        const jobRequirements = jobAnalysis.requirements || [];
        
        // Find skills that match the project technologies
        const projectTech = project.technologies || [];
        const matchingSkills = jobSkills.filter((skill: string) => 
            projectTech.some((tech: string) => 
                tech.toLowerCase().includes(skill.toLowerCase()) || 
                skill.toLowerCase().includes(tech.toLowerCase())
            )
        );
        
        // Enhance description with relevant technical terms
        let enhancedDesc = baseDescription;
        
        // Add performance and scalability keywords if relevant
        if (jobRequirements.some((req: string) => req.toLowerCase().includes('performance') || req.toLowerCase().includes('scalable'))) {
            if (!enhancedDesc.toLowerCase().includes('performance') && !enhancedDesc.toLowerCase().includes('scalable')) {
                enhancedDesc += ' Optimized for performance and scalability to handle increased user loads.';
            }
        }
        
        // Add security keywords if relevant
        if (jobRequirements.some((req: string) => req.toLowerCase().includes('security') || req.toLowerCase().includes('secure'))) {
            if (!enhancedDesc.toLowerCase().includes('security') && !enhancedDesc.toLowerCase().includes('secure')) {
                enhancedDesc += ' Implemented secure coding practices and data protection measures.';
            }
        }
        
        // Add testing keywords if relevant
        if (jobRequirements.some((req: string) => req.toLowerCase().includes('test') || req.toLowerCase().includes('quality'))) {
            if (!enhancedDesc.toLowerCase().includes('test') && !enhancedDesc.toLowerCase().includes('quality')) {
                enhancedDesc += ' Followed test-driven development and quality assurance practices.';
            }
        }
        
        return enhancedDesc;
    }
    
    if (projects.length === 0) {
        // Return null to hide the entire projects section
        return null;
    }
    
    return `<div class="projects-section">
        ${projects.map((project: any) => {
            // Enhanced technology matching with job-relevant skills
            let projectTech = project.technologies || [];
            
            // If project has technologies, prioritize those that match job requirements
            if (projectTech.length > 0) {
                // Filter and prioritize technologies that match relevant skills
                const matchingTech = projectTech.filter((tech: string) => 
                    relevantSkills.some(skill => 
                        skill.toLowerCase().includes(tech.toLowerCase()) || 
                        tech.toLowerCase().includes(skill.toLowerCase())
                    )
                );
                
                // Combine matching technologies with most relevant skills
                const combinedTech = [...matchingTech, ...relevantSkills.slice(0, 3)]
                    .filter((tech, index, arr) => arr.indexOf(tech) === index) // Remove duplicates
                    .slice(0, 6); // Limit to 6 technologies
                
                projectTech = combinedTech.length > 0 ? combinedTech : projectTech.slice(0, 4);
            } else {
                // If no technologies specified, use relevant skills
                projectTech = relevantSkills.slice(0, 4);
            }
                
            const technologies = projectTech.join(', ');
            
            // Enhanced project description with ATS keywords
            const enhancedDescription = enhanceProjectDescription(project, relevantSkills, jobAnalysis);
            
            // Format project dates if available
            const dateRange = project.startDate || project.endDate ? 
                ` (${formatProjectDate(project.startDate)} - ${formatProjectDate(project.endDate) || 'Present'})` : '';
                
            return `
            <div class="project-item">
                <div class="project-title">${project.name || 'Technology Project'}${dateRange}</div>
                <div class="project-tech">Technologies: ${technologies}</div>
                <div class="project-description">${enhancedDescription}</div>
                ${project.url ? `<div class="project-tech">Project URL: ${project.url}</div>` : ''}
                ${project.repository ? `<div class="project-tech">Repository: ${project.repository}</div>` : ''}
            </div>`;
        }).join('')}
    </div>`;
}

// Helper function to format project dates
function formatProjectDate(dateValue: any): string {
    if (!dateValue) return '';
    try {
        const date = new Date(dateValue);
        if (isNaN(date.getTime())) return '';
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    } catch {
        return '';
    }
}

function generateCertificationsSection(userProfile: any, jobAnalysis: any = null): string | null {
    const certifications = userProfile?.certifications || [];
    
    // If user has no certifications, return null to hide the entire section
    if (certifications.length === 0) {
        return null;
    }
    
    // Extract relevant certification keywords from job analysis for enhancement only
    const getRelevantCertifications = (jobAnalysis: any): string[] => {
        if (!jobAnalysis) return [];
        
        const jobContent = (jobAnalysis?.content || JSON.stringify(jobAnalysis)).toLowerCase();
        const certificationKeywords = [
            'aws', 'azure', 'google cloud', 'kubernetes', 'docker', 'scrum master',
            'pmp', 'cissp', 'comptia', 'oracle', 'microsoft', 'cisco',
            'salesforce', 'jenkins', 'terraform', 'ansible', 'react', 'angular',
            'vue', 'node.js', 'python', 'java', 'security+', 'network+'
        ];
        
        return certificationKeywords.filter(keyword => jobContent.includes(keyword));
    };
    
    const relevantCertKeywords = getRelevantCertifications(jobAnalysis);
    
    return `<ul class="certifications-list">
        ${certifications.map((cert: any) => {
            const issueDate = cert.issueDate ? formatDate(cert.issueDate) : '';
            const expirationDate = cert.expirationDate ? ` - Expires ${formatDate(cert.expirationDate)}` : '';
            const dateInfo = issueDate ? ` (${issueDate}${expirationDate})` : '';
            
            // Only enhance the display of ACTUAL certifications the user has
            const certName = cert.name || 'Certification';
            const issuer = cert.issuer || 'Organization';
            
            return `<li>${certName} - ${issuer}${dateInfo}</li>`;
        }).join('')}
    </ul>`;
}

function generateEducationSection(userProfile: any, jobAnalysis: any = null): string | null {
    const education = userProfile?.education || [];
    
    // Extract relevant academic keywords from job analysis
    const getRelevantAcademicKeywords = (jobAnalysis: any): string[] => {
        if (!jobAnalysis) return [];
        
        const jobContent = (jobAnalysis?.content || JSON.stringify(jobAnalysis)).toLowerCase();
        const academicKeywords = [
            'computer science', 'software engineering', 'information technology', 'engineering',
            'mathematics', 'data science', 'cybersecurity', 'artificial intelligence',
            'machine learning', 'algorithms', 'data structures', 'database systems',
            'web development', 'mobile development', 'cloud computing', 'networking'
        ];
        
        return academicKeywords.filter(keyword => jobContent.includes(keyword));
    };
    
    const relevantKeywords = getRelevantAcademicKeywords(jobAnalysis);
    
    if (education.length === 0) {
        // Return null to hide the entire education section
        return null;
    }
    
    return education.map((edu: any) => {
        const startDate = edu.startDate ? formatDate(edu.startDate) : 'Unknown';
        const endDate = edu.endDate ? formatDate(edu.endDate) : 'Unknown';
        const duration = `${startDate} - ${endDate}`;
        
        // Only enhance existing education description with relevant keywords if there's already content
        let enhancedDescription = edu.description || '';
        
        if (jobAnalysis && enhancedDescription && relevantKeywords.length > 0) {
            // Only add keywords if they're naturally relevant to the existing description
            const missingKeywords = relevantKeywords.filter(keyword => 
                !enhancedDescription.toLowerCase().includes(keyword) &&
                // Only add if the keyword could realistically be part of this degree
                (edu.degree || '').toLowerCase().includes('computer') ||
                (edu.degree || '').toLowerCase().includes('engineering') ||
                (edu.degree || '').toLowerCase().includes('technology') ||
                (edu.degree || '').toLowerCase().includes('science')
            ).slice(0, 2); // Limit to 2 keywords maximum
            
            if (missingKeywords.length > 0) {
                const formattedKeywords = missingKeywords.map(keyword => 
                    keyword.split(' ').map(word => 
                        word.charAt(0).toUpperCase() + word.slice(1)
                    ).join(' ')
                );
                enhancedDescription += ` Coursework included ${formattedKeywords.join(' and ')}.`;
            }
        }
        
        return `
        <div class="education-item">
            <div class="education-header">
                <span class="degree">${edu.degree || 'Degree'}</span> - <span class="university">${edu.institution || 'Institution'}</span>
                <span class="education-duration">${duration}</span>
                <div class="clear"></div>
            </div>
            ${enhancedDescription ? `<div class="coursework">${enhancedDescription}</div>` : ''}
        </div>`;
    }).join('');
}

function formatDate(date: any): string {
    if (!date) return 'Unknown';
    
    try {
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        if (isNaN(dateObj.getTime())) return 'Unknown';
        
        const month = dateObj.toLocaleDateString('en-US', { month: 'short' });
        const year = dateObj.getFullYear();
        return `${month} ${year}`;
    } catch (error) {
        return 'Unknown';
    }
}

// AI Enhancement Helper Function
async function enhanceContentWithAI(content: string, jobDescription: string, section: string, userProfile?: any): Promise<string | null> {
    try {
        if (!process.env.GEMINI_API_KEY) {
            console.log('[AI Enhancement] Gemini API key not configured, skipping AI enhancement');
            return null;
        }

        // Generate section-specific prompts
        let prompt = '';
        
        switch (section) {
            case 'summary':
                prompt = `Enhance this professional summary to better match the job description. Make it ATS-friendly and incorporate relevant keywords naturally.

Job Description:
${jobDescription}

Current Summary:
${content}

Instructions:
- Keep it concise (2-3 sentences)
- Include relevant keywords from the job description
- Highlight matching skills and experience
- Make it compelling and professional
- Return only the enhanced summary, no additional text`;
                break;

            case 'experience':
                prompt = `Enhance this work experience description to better align with the job requirements. Add relevant keywords and quantify achievements where possible.

Job Description:
${jobDescription}

Current Experience Description:
${content}

Instructions:
- Use action verbs and quantify achievements
- Include relevant keywords from the job description
- Highlight transferable skills
- Keep it professional and honest
- Return only the enhanced description, no additional text`;
                break;

            default:
                prompt = `Enhance this CV content to be more ATS-friendly and better aligned with the job description.

Job Description:
${jobDescription}

Current Content:
${content}

Instructions:
- Incorporate relevant keywords naturally
- Improve clarity and impact
- Make it more professional
- Ensure ATS compatibility
- Return only the enhanced content, no additional text`;
                break;
        }

        // Call Gemini API
        const geminiResponse = await fetch(
            'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': process.env.GEMINI_API_KEY
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.4,
                        maxOutputTokens: 1024,
                    }
                })
            }
        );

        if (!geminiResponse.ok) {
            console.error('[AI Enhancement] Gemini API error:', await geminiResponse.text());
            return null;
        }

        const geminiData = await geminiResponse.json();
        
        if (geminiData.candidates?.[0]?.content?.parts?.[0]?.text) {
            return geminiData.candidates[0].content.parts[0].text.trim();
        }
        
        return null;
    } catch (error) {
        console.error('[AI Enhancement] Error:', (error as Error).message);
        return null;
    }
}

async function generateJobMatchedSummary(userProfile: any, jobAnalysis: any, jobTitle: string, companyName: string): Promise<string> {
    const personalInfo = userProfile?.personalInfo || {};
    const experience = userProfile?.experience || [];
    const skills = userProfile?.skills || {};
    const userSummary = personalInfo?.summary || '';
    
    // Calculate years of experience from actual experience entries
    const totalYears = experience.length > 0 ? 
        Math.max(2, experience.reduce((years: number, exp: any) => {
            if (exp.startDate) {
                const startYear = new Date(exp.startDate).getFullYear();
                const endYear = exp.isCurrent ? new Date().getFullYear() : 
                    (exp.endDate ? new Date(exp.endDate).getFullYear() : new Date().getFullYear());
                return years + (endYear - startYear);
            }
            return years + 1;
        }, 0)) : 3;
    
    // If user has a summary, try to enhance it with AI
    if (userSummary && userSummary.trim()) {
        try {
            const enhancedSummary = await enhanceContentWithAI(
                userSummary.trim(),
                jobAnalysis?.content || JSON.stringify(jobAnalysis),
                'summary',
                userProfile
            );
            
            if (enhancedSummary) {
                return enhancedSummary;
            }
        } catch (error) {
            console.log('[AI Enhancement] Failed to enhance summary, using fallback:', (error as Error).message);
        }
    }
    
    // Fallback to manual enhancement if AI fails or no summary exists
    const jobContent = jobAnalysis?.content || JSON.stringify(jobAnalysis);
    const jobRequirements = extractJobRequirements(jobContent);
    
    // Get user's actual technical skills
    const userTechnicalSkills = skills?.technical || [];
    const userSoftSkills = skills?.soft || [];
    
    // Find matching skills between user profile and job requirements
    const matchingTechSkills = userTechnicalSkills.filter((userSkill: string) => 
        jobRequirements.technologies.some((jobTech: string) => 
            jobTech.toLowerCase().includes(userSkill.toLowerCase()) || 
            userSkill.toLowerCase().includes(jobTech.toLowerCase())
        )
    );
    
    const matchingSoftSkills = userSoftSkills.filter((userSkill: string) => 
        jobRequirements.skills.some((jobSkill: string) => 
            jobSkill.toLowerCase().includes(userSkill.toLowerCase()) || 
            userSkill.toLowerCase().includes(jobSkill.toLowerCase())
        )
    );
    
    // If user has a summary, enhance it with relevant keywords (fallback)
    if (userSummary && userSummary.trim()) {
        let enhancedSummary = userSummary.trim();
        
        // Add relevant technical skills if not already mentioned
        const missingTechSkills = matchingTechSkills.filter((skill: string) => 
            !enhancedSummary.toLowerCase().includes(skill.toLowerCase())
        ).slice(0, 3);
        
        if (missingTechSkills.length > 0) {
            enhancedSummary += ` Experienced in ${missingTechSkills.join(', ')} technologies.`;
        }
        
        // Add relevant soft skills if not already mentioned
        const missingSoftSkills = matchingSoftSkills.filter((skill: string) => 
            !enhancedSummary.toLowerCase().includes(skill.toLowerCase())
        ).slice(0, 2);
        
        if (missingSoftSkills.length > 0) {
            enhancedSummary += ` Strong capabilities in ${missingSoftSkills.join(' and ').toLowerCase()}.`;
        }
        
        // Add years of experience if not mentioned
        if (!enhancedSummary.toLowerCase().includes('year')) {
            enhancedSummary = `${enhancedSummary} With ${totalYears}+ years of professional experience.`;
        }
        
        return enhancedSummary;
    }
    
    // If no user summary, create one based on actual profile data
    const primaryTechSkills = matchingTechSkills.length > 0 ? 
        matchingTechSkills.slice(0, 3) : userTechnicalSkills.slice(0, 3);
    const primarySoftSkills = matchingSoftSkills.length > 0 ? 
        matchingSoftSkills.slice(0, 2) : ['problem solving', 'team collaboration'];
    
    // Create summary based on user's actual experience
    const experienceContext = experience.length > 0 ? 
        `Results-driven ${jobTitle.toLowerCase()} with ${totalYears}+ years of experience` :
        `Motivated ${jobTitle.toLowerCase()} with strong foundation`;
    
    const techContext = primaryTechSkills.length > 0 ? 
        `in ${primaryTechSkills.join(', ')}` : 
        `in modern software development technologies`;
    
    const skillContext = primarySoftSkills.length > 0 ? 
        `Demonstrated expertise in ${primarySoftSkills.join(' and ')}` : 
        `Strong analytical and communication skills`;
    
    const tailoredSummary = 
        `${experienceContext} ${techContext}. ${skillContext} with a proven track record of delivering high-quality solutions. 
        ${experience.some((exp: any) => exp.achievements && exp.achievements.length > 0) ? 'Consistently achieved project goals and exceeded performance expectations.' : 'Passionate about creating efficient and scalable applications.'}
        ${companyName ? `Seeking to contribute technical expertise and drive innovation at ${companyName}.` : 'Ready to take on new challenges and drive technical excellence.'}`;
    
    return tailoredSummary;
}

function matchSkillsWithJobRequirements(technicalSkills: string[], softSkills: string[], jobAnalysis: any, extractedSkills: string[]): any {
    const jobContent = (jobAnalysis?.content || JSON.stringify(jobAnalysis)).toLowerCase();
    
    // Match technical skills with job requirements
    const matchedTechnical = [
        ...technicalSkills.filter(skill => 
            jobContent.includes(skill.toLowerCase()) || 
            extractedSkills.some(es => es.toLowerCase().includes(skill.toLowerCase()))
        ),
        ...extractedSkills.filter(skill => 
            technicalSkills.some(ts => ts.toLowerCase().includes(skill.toLowerCase()))
        )
    ].filter((skill, index, arr) => arr.indexOf(skill) === index); // Remove duplicates
    
    // Add essential skills if not present
    const essentialSkills = ['JavaScript', 'HTML', 'CSS', 'React', 'Node.js', 'Python', 'SQL'];
    const finalTechnical = [...new Set([...matchedTechnical, ...essentialSkills.filter(skill => 
        jobContent.includes(skill.toLowerCase())
    )])].slice(0, 12); // Limit to top 12 skills
    
    // Match soft skills
    const jobSoftSkills = ['Communication', 'Problem Solving', 'Team Collaboration', 'Critical Thinking', 'Adaptability'];
    const matchedSoft = [
        ...softSkills,
        ...jobSoftSkills.filter(skill => jobContent.includes(skill.toLowerCase().replace(' ', '')))
    ].filter((skill, index, arr) => arr.indexOf(skill) === index).slice(0, 6);
    
    return {
        technical: finalTechnical,
        soft: matchedSoft
    };
}

function extractATSKeywords(jobAnalysis: any, matchedSkills: any): string[] {
    const jobContent = (jobAnalysis?.content || JSON.stringify(jobAnalysis)).toLowerCase();
    
    // Common ATS keywords based on job content
    const atsKeywords = [
        ...matchedSkills.technical,
        ...matchedSkills.soft,
        'Software Development',
        'Full Stack Development',
        'Web Development',
        'Application Development',
        'System Design',
        'Database Management',
        'API Development',
        'Code Review',
        'Testing',
        'Debugging',
        'Performance Optimization',
        'Agile Methodology',
        'Scrum',
        'Version Control',
        'Git',
        'Project Management',
        'Quality Assurance',
        'Technical Documentation'
    ];
    
    // Filter keywords that appear in job description
    return atsKeywords.filter(keyword => 
        jobContent.includes(keyword.toLowerCase().replace(' ', '')) ||
        jobContent.includes(keyword.toLowerCase())
    ).slice(0, 20);
}

function extractJobRequirements(jobContent: string): any {
    const content = jobContent.toLowerCase();
    
    return {
        technologies: extractListFromContent(content, [
            'javascript', 'typescript', 'react', 'angular', 'vue', 'node.js', 'python', 
            'java', 'c#', 'php', 'ruby', 'html', 'css', 'sql', 'mongodb', 'postgresql'
        ]),
        skills: extractListFromContent(content, [
            'develop', 'design', 'implement', 'build', 'create', 'maintain', 'optimize',
            'collaborate', 'lead', 'mentor', 'troubleshoot', 'debug', 'test'
        ]),
        experience: extractListFromContent(content, [
            'leadership', 'team', 'agile', 'scrum', 'project management', 'mentoring'
        ]),
        focus: content.includes('frontend') ? 'frontend development' :
               content.includes('backend') ? 'backend development' :
               content.includes('fullstack') || content.includes('full stack') ? 'full-stack development' :
               'software development'
    };
}

function extractListFromContent(content: string, keywords: string[]): string[] {
    return keywords.filter(keyword => content.includes(keyword));
}

function generateTailoredSummary(userProfile: any, skills: string[], jobTitle: string): string {
    const experience = userProfile?.experience || [];
    const totalYears = experience.length > 0 ? experience.length + 2 : 5;
    
    const topSkills = skills.slice(0, 4).join(', ');
    
    return `Experienced ${jobTitle.toLowerCase()} with ${totalYears}+ years of expertise in full-stack development and modern web technologies. Proven track record of delivering scalable applications using ${topSkills}, and other cutting-edge technologies. Strong background in agile methodologies, code optimization, and technical leadership. Passionate about creating efficient, maintainable solutions that drive business value and enhance user experience. Demonstrated ability to mentor teams, implement best practices, and deliver projects on time while maintaining high code quality standards.`;
}

function getSkillsForCategory(categorySkills: string[], matchedSkills: string[]): string {
    const foundSkills = categorySkills.filter(skill => 
        matchedSkills.some(matched => 
            matched.toLowerCase().includes(skill.toLowerCase()) || 
            skill.toLowerCase().includes(matched.toLowerCase())
        )
    );
    
    // If no matches found, include some common skills from the category
    if (foundSkills.length === 0) {
        foundSkills.push(categorySkills[0], categorySkills[1]);
    }
    
    return foundSkills.join(', ');
}