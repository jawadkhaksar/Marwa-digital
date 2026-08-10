-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'EDITOR');

-- CreateEnum
CREATE TYPE "PageEditorMode" AS ENUM ('CLASSIC', 'BUILDER');

-- CreateEnum
CREATE TYPE "CollectionFieldType" AS ENUM ('TEXT', 'RICH_TEXT', 'NUMBER', 'BOOLEAN', 'IMAGE', 'IMAGE_LIST', 'DATE', 'SELECT', 'REFERENCE', 'JSON');

-- CreateEnum
CREATE TYPE "CollectionItemStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "PostStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'SCHEDULED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'EDITOR',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "avatarUrl" TEXT,
    "bio" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailTemplate" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactInquiry" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "subject" TEXT,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactInquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormSubmission" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "pageSlug" TEXT NOT NULL,
    "blockId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "actionsLog" JSONB,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "userIp" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FormSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "quote" TEXT NOT NULL,
    "rating" INTEGER NOT NULL DEFAULT 5,
    "source" TEXT NOT NULL DEFAULT 'Website',
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Page" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "editorMode" "PageEditorMode" NOT NULL DEFAULT 'CLASSIC',
    "content" TEXT,
    "layout" JSONB,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "metaKeywords" TEXT,
    "ogImage" TEXT,
    "metaRobotsIndex" BOOLEAN NOT NULL DEFAULT true,
    "metaRobotsFollow" BOOLEAN NOT NULL DEFAULT true,
    "headTags" TEXT,
    "customCss" TEXT,
    "customJs" TEXT,
    "template" TEXT NOT NULL DEFAULT 'default',
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Page_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Collection" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionField" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "CollectionFieldType" NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "options" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollectionField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionItem" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "slug" TEXT,
    "data" JSONB NOT NULL,
    "status" "CollectionItemStatus" NOT NULL DEFAULT 'DRAFT',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollectionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Menu" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "autoAddPages" BOOLEAN NOT NULL DEFAULT false,
    "showInHeader" BOOLEAN NOT NULL DEFAULT false,
    "showInFooter" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Menu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuItem" (
    "id" TEXT NOT NULL,
    "menuId" TEXT NOT NULL,
    "parentId" TEXT,
    "label" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "cssClasses" TEXT,
    "openInNewTab" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "previewImage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FooterLink" (
    "id" TEXT NOT NULL,
    "group" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FooterLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "siteName" TEXT NOT NULL DEFAULT 'Marwa Digital',
    "tagline" TEXT NOT NULL DEFAULT 'Design, Build, Grow.',
    "description" TEXT NOT NULL DEFAULT 'A digital studio building websites, brands, and products.',
    "contactEmail" TEXT NOT NULL DEFAULT 'hello@marwadigital.com',
    "contactPhone" TEXT NOT NULL DEFAULT '',
    "whatsappNumber" TEXT,
    "contactAddress" TEXT NOT NULL DEFAULT '',
    "contactResponseTime" TEXT NOT NULL DEFAULT 'Under 24 Hours',
    "facebookUrl" TEXT,
    "instagramUrl" TEXT,
    "twitterUrl" TEXT,
    "youtubeUrl" TEXT,
    "linkedinUrl" TEXT,
    "logoImage" TEXT,
    "footerCopyrightText" TEXT NOT NULL DEFAULT 'All Rights Reserved © {year} {siteName}.',
    "smoothScrollEnabled" BOOLEAN NOT NULL DEFAULT false,
    "customCursorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "cursorGlowEnabled" BOOLEAN NOT NULL DEFAULT false,
    "contactHeroImage" TEXT NOT NULL DEFAULT '',
    "contactEyebrow" TEXT NOT NULL DEFAULT 'Let''s Work Together',
    "contactHeading" TEXT NOT NULL DEFAULT 'Get In Touch',
    "contactParagraph" TEXT NOT NULL DEFAULT 'Tell us about your project and we''ll get back to you within one business day.',
    "contactCtaPrimaryLabel" TEXT NOT NULL DEFAULT 'Start a Project',
    "contactCtaSecondaryLabel" TEXT NOT NULL DEFAULT 'Request a Quote',
    "contactInfoEyebrow" TEXT NOT NULL DEFAULT 'Contact',
    "contactInfoTitle" TEXT NOT NULL DEFAULT 'Talk To Us',
    "contactBusinessHours" TEXT NOT NULL DEFAULT 'Mon–Fri, 9:00–18:00',
    "contactFaqHeading" TEXT NOT NULL DEFAULT 'Frequently Asked Questions',
    "blogArchiveTemplate" TEXT NOT NULL DEFAULT 'A',
    "blogPostTemplate" TEXT NOT NULL DEFAULT 'A',
    "recaptchaV2SiteKey" TEXT,
    "recaptchaV2SecretKey" TEXT,
    "recaptchaV3SiteKey" TEXT,
    "recaptchaV3SecretKey" TEXT,
    "recaptchaV3ScoreThreshold" TEXT NOT NULL DEFAULT '0.5',
    "smtpHost" TEXT,
    "smtpPort" TEXT,
    "smtpUser" TEXT,
    "smtpPassword" TEXT,
    "smtpSecure" BOOLEAN NOT NULL DEFAULT true,
    "smtpFromEmail" TEXT,
    "smtpFromName" TEXT,
    "primaryMenuId" TEXT,
    "siteIcon" TEXT,
    "siteUrl" TEXT NOT NULL DEFAULT 'https://marwadigital.com',
    "adminEmail" TEXT NOT NULL DEFAULT 'hello@marwadigital.com',
    "timezone" TEXT NOT NULL DEFAULT 'UTC+0',
    "dateFormat" TEXT NOT NULL DEFAULT 'F j, Y',
    "timeFormat" TEXT NOT NULL DEFAULT 'g:i a',
    "siteLanguage" TEXT NOT NULL DEFAULT 'en',
    "homepageDisplay" TEXT NOT NULL DEFAULT 'static',
    "homepagePageSlug" TEXT,
    "postsPageSlug" TEXT,
    "postsPerPage" INTEGER NOT NULL DEFAULT 10,
    "feedItemCount" INTEGER NOT NULL DEFAULT 10,
    "feedContentMode" TEXT NOT NULL DEFAULT 'full',
    "searchEngineNoindex" BOOLEAN NOT NULL DEFAULT false,
    "defaultPostCategoryId" TEXT,
    "defaultPostFormat" TEXT NOT NULL DEFAULT 'STANDARD',
    "updateServiceUrls" TEXT DEFAULT 'https://rpc.pingomatic.com/',
    "permalinkStructure" TEXT NOT NULL DEFAULT '/%postname%/',
    "categoryBase" TEXT,
    "tagBase" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteTemplate" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "layout" JSONB NOT NULL,
    "conditions" JSONB NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StyleClass" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "style" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StyleClass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimedAnimation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "timeline" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimedAnimation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Faq" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Faq_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT,
    "editorMode" "PageEditorMode" NOT NULL DEFAULT 'CLASSIC',
    "content" TEXT,
    "layout" JSONB,
    "featuredImage" TEXT,
    "authorId" TEXT,
    "status" "PostStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "readingTime" INTEGER,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "canonicalUrl" TEXT,
    "ogImage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "postNumber" SERIAL NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'STANDARD',

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CategoryToPost" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CategoryToPost_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_PostToTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_PostToTag_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "EmailTemplate_key_key" ON "EmailTemplate"("key");

-- CreateIndex
CREATE INDEX "FormSubmission_formId_idx" ON "FormSubmission"("formId");

-- CreateIndex
CREATE INDEX "FormSubmission_pageSlug_idx" ON "FormSubmission"("pageSlug");

-- CreateIndex
CREATE UNIQUE INDEX "Page_slug_key" ON "Page"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Collection_key_key" ON "Collection"("key");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionField_collectionId_key_key" ON "CollectionField"("collectionId", "key");

-- CreateIndex
CREATE INDEX "CollectionItem_collectionId_status_idx" ON "CollectionItem"("collectionId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionItem_collectionId_slug_key" ON "CollectionItem"("collectionId", "slug");

-- CreateIndex
CREATE INDEX "MenuItem_menuId_idx" ON "MenuItem"("menuId");

-- CreateIndex
CREATE INDEX "MenuItem_parentId_idx" ON "MenuItem"("parentId");

-- CreateIndex
CREATE INDEX "SiteTemplate_type_idx" ON "SiteTemplate"("type");

-- CreateIndex
CREATE UNIQUE INDEX "StyleClass_name_key" ON "StyleClass"("name");

-- CreateIndex
CREATE UNIQUE INDEX "TimedAnimation_name_key" ON "TimedAnimation"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_slug_key" ON "Tag"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Post_slug_key" ON "Post"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Post_postNumber_key" ON "Post"("postNumber");

-- CreateIndex
CREATE INDEX "Post_status_idx" ON "Post"("status");

-- CreateIndex
CREATE INDEX "Post_publishedAt_idx" ON "Post"("publishedAt");

-- CreateIndex
CREATE INDEX "_CategoryToPost_B_index" ON "_CategoryToPost"("B");

-- CreateIndex
CREATE INDEX "_PostToTag_B_index" ON "_PostToTag"("B");

-- AddForeignKey
ALTER TABLE "CollectionField" ADD CONSTRAINT "CollectionField_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionItem" ADD CONSTRAINT "CollectionItem_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_menuId_fkey" FOREIGN KEY ("menuId") REFERENCES "Menu"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "MenuItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CategoryToPost" ADD CONSTRAINT "_CategoryToPost_A_fkey" FOREIGN KEY ("A") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CategoryToPost" ADD CONSTRAINT "_CategoryToPost_B_fkey" FOREIGN KEY ("B") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PostToTag" ADD CONSTRAINT "_PostToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PostToTag" ADD CONSTRAINT "_PostToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

