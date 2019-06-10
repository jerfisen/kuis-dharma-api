import { Resolver, Args, Mutation, ResolveProperty, Parent } from "@nestjs/graphql";
import { Question, Answer, ArgCreateQuestion, ArgQuestionId } from './question.dto';
import { QuestionService } from './question.service';
import { AnswerService } from './answer.service';
import { Topic } from '../topic/topic.dto';

@Resolver( of => Question )
export class QuestionResolver {
    constructor(
        private readonly question_service: QuestionService,
        private readonly answer_service: AnswerService,
    ){}

    @Mutation( returns => Question )
    async createQuestion( @Args() args: ArgCreateQuestion ): Promise<Question> {
        try {
            return await this.question_service.create(args);
        } catch ( error ) {
            throw error;
        }
    }

    @ResolveProperty()
    async answers( @Parent() question: Question ): Promise<Answer[]> {
        try {
            return await this.answer_service.findByQuestion(question.id);
        } catch ( error ) {
            throw error;
        }
    }
}