import type { CreateHelpArticleInput, UpdateHelpArticleInput } from './help.schema';
export declare class HelpRepository {
    listPublished(): import(".prisma/client").Prisma.PrismaPromise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        category: string;
        question: string;
        answer: string;
        order: number;
        published: boolean;
    }[]>;
    listAll(): import(".prisma/client").Prisma.PrismaPromise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        category: string;
        question: string;
        answer: string;
        order: number;
        published: boolean;
    }[]>;
    findById(id: string): import(".prisma/client").Prisma.Prisma__HelpArticleClient<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        category: string;
        question: string;
        answer: string;
        order: number;
        published: boolean;
    } | null, null, import("@prisma/client/runtime/library").DefaultArgs>;
    create(data: CreateHelpArticleInput): import(".prisma/client").Prisma.Prisma__HelpArticleClient<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        category: string;
        question: string;
        answer: string;
        order: number;
        published: boolean;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
    update(id: string, data: UpdateHelpArticleInput): import(".prisma/client").Prisma.Prisma__HelpArticleClient<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        category: string;
        question: string;
        answer: string;
        order: number;
        published: boolean;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
    delete(id: string): import(".prisma/client").Prisma.Prisma__HelpArticleClient<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        category: string;
        question: string;
        answer: string;
        order: number;
        published: boolean;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
    togglePublished(id: string, published: boolean): import(".prisma/client").Prisma.Prisma__HelpArticleClient<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        category: string;
        question: string;
        answer: string;
        order: number;
        published: boolean;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
}
//# sourceMappingURL=help.repository.d.ts.map